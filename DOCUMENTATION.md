# DOCUMENTATION.md — rilog-local-server

Technical reference: architecture, algorithms, data models, and system diagrams.

---

## 1. System Overview

```
┌─────────────────────────────────┐
│      Browser (rilog-lib)        │
│                                 │
│  captures: clicks, requests,    │
│  console errors, inputs,        │
│  debug messages                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │  POST /api/events/save  │   │
│  │  or sendBeacon on unload│   │
│  └──────────┬──────────────┘   │
└─────────────┼───────────────────┘
              │ HTTP
              ▼
┌─────────────────────────────────┐
│      rilog-local-server         │
│         :3030                   │
│                                 │
│  Express + body parsers         │
│  EventsController               │
│  EventsService                  │
│  FileRotator (mutex)            │
│  Writer (ndjson/json/txt)       │
└──────────────┬──────────────────┘
               │ fs.appendFile / fs.writeFile
               ▼
┌─────────────────────────────────┐
│          logs/                  │
│  ├── my-app/                    │
│  │   ├── 2025-05-15.log.ndjson  │
│  │   └── 2025-05-16.log.ndjson  │
│  └── admin/                     │
│      └── 2025-05-15.log.ndjson  │
└─────────────────────────────────┘
               │ (future)
               ▼
┌─────────────────────────────────┐
│      rilog-dashboard            │
│  GET /api/apps                  │
│  GET /api/logs/:app/:date       │
└─────────────────────────────────┘
```

---

## 2. Request Lifecycle

### 2.1 Normal JSON request (from browser `fetch`)

```
Browser
  │
  │  POST /api/events/save
  │  Content-Type: application/json
  │  Body: { events: "...", uToken: "...", appName: "...", params: {...} }
  │
  ▼
Express middleware chain
  ├── cors()                       → sets CORS headers, checks origin
  ├── express.json()               → parses body; req.body = object
  ├── express.text()               → skipped (wrong content-type)
  └── express.raw()                → skipped (wrong content-type)
  │
  ▼
EventsController.saveEvents()
  ├── typeof req.body === 'object' → use as-is
  ├── validate: events, uToken, appName present
  ├── JSON.parse(body.events)      → IRilogEventItem[]
  └── eventsService.saveEvents({ uToken, appName, params, events })
  │
  ▼
EventsService.saveEvents()
  ├── build LogEntry { timestamp: now.toISOString(), uToken, appName, params, events }
  └── fileRotator.write(appName, entry, writer)
  │
  ▼
FileRotator.write()                [mutex acquired for appName]
  ├── slugify(appName)             → folder name
  ├── getTodayString()             → "2025-05-15" (timezone-aware)
  ├── resolveFilePath()
  │   ├── fs.mkdir(folderPath, recursive)
  │   ├── stat "2025-05-15.log.ndjson" → size < maxBytes? → use it
  │   └── if over limit → try "_part2", "_part3", ... until not found
  └── writer.write(filePath, entry) → appends to file
  │                                 [mutex released]
  ▼
EventsController
  └── res.json({ result: "SUCCESS", file: "logs/my-app/2025-05-15.log.ndjson" })
```

### 2.2 sendBeacon request (page unload)

```
Browser
  │
  │  navigator.sendBeacon('/api/events/save', blob)
  │  Content-Type: text/plain  (or application/octet-stream)
  │
  ▼
Express middleware chain
  ├── cors()
  ├── express.json()    → skipped
  ├── express.text()    → if text/plain:  req.body = string (raw JSON text)
  └── express.raw()     → if octet-stream: req.body = Buffer
  │
  ▼
EventsController.saveEvents()
  ├── Buffer.isBuffer(req.body) → body.toString('utf-8') → JSON.parse()
  ├── typeof req.body === 'string' → JSON.parse(req.body)
  └── ... same path as above
```

---

## 3. File Rotation Algorithm

```
resolveFilePath(appName, extension):
  ┌─────────────────────────────────────────┐
  │  folderPath = logsDir / slugify(appName)│
  │  dateStr    = getTodayString()           │
  │  part       = 1                          │
  │  filePath   = folderPath/dateStr.log.ext│
  └──────────────────┬──────────────────────┘
                     │
                     ▼
             ┌───────────────┐
             │  stat(filePath)│
             └───────┬───────┘
                     │
         ┌───────────┴──────────┐
         │                      │
    [ENOENT: not found]    [found: size = S]
         │                      │
         ▼                      ▼
    return filePath        S < maxBytes?
    (new file)             │
                     ┌─────┴─────┐
                     │           │
                   [yes]        [no]
                     │           │
                     ▼           ▼
               return filePath  part++
               (has capacity)   filePath = dateStr_partN.log.ext
                                │
                                └── go back to stat(filePath)
```

Example output for a busy day:
```
2025-05-15.log.ndjson        ← fills to 10 MB
2025-05-15_part2.log.ndjson  ← fills to 10 MB
2025-05-15_part3.log.ndjson  ← current, still filling
```

---

## 4. Concurrency Model

```
Request A (app=myapp)          Request B (app=myapp)        Request C (app=other)
         │                              │                            │
         ▼                              ▼                            ▼
   getMutex("myapp")             getMutex("myapp")           getMutex("other")
         │                              │                            │
   [mutex free]                  [mutex locked]              [mutex free]
         │                              │                            │
   acquire mutex                   wait...                    acquire mutex
         │                              │                            │
   resolveFilePath()            (blocked until A done)        resolveFilePath()
   writer.write()                       │                     writer.write()
         │                              │                            │
   release mutex                  acquire mutex               release mutex
                                  resolveFilePath()
                                  writer.write()
                                  release mutex
```

Key properties:
- Requests for **different apps** execute concurrently (separate mutexes).
- Requests for the **same app** are serialized — ensures the size check and write are atomic.
- The mutex map lives in the singleton `fileRotator` instance (module-level export).

---

## 5. Writer Strategies

### 5.1 NdjsonWriter (default)

**File structure:**
```
{"timestamp":"2025-05-15T10:00:00Z","uToken":"abc","appName":"myapp","events":[...]}\n
{"timestamp":"2025-05-15T10:01:00Z","uToken":"abc","appName":"myapp","events":[...]}\n
{"timestamp":"2025-05-15T10:02:00Z","uToken":"xyz","appName":"myapp","events":[...]}\n
```

**Write algorithm:**
```
fs.appendFile(filePath, JSON.stringify(entry) + '\n')
```

**Read algorithm (server-side):**
```
readline.createInterface(createReadStream(filePath))
→ for each line: JSON.parse(line)
```

**Pros:** Simple append, safe for concurrent readers, ideal for streaming, memory-efficient.

---

### 5.2 JsonWriter

**File structure:**
```json
[
  { "timestamp": "...", "events": [...] },
  { "timestamp": "...", "events": [...] }
]
```

**Write algorithm (first write):**
```
fs.writeFile(filePath, '[\n' + JSON.stringify(entry, null, 2) + '\n]')
```

**Write algorithm (subsequent writes):**
```
1. stat(filePath) → get size S
2. open(filePath, 'r+')
3. Scan backward from byte S-1 past whitespace/newlines
   to find the position of ']' (closePos)
4. Write Buffer(',\n' + JSON.stringify(entry, null, 2) + '\n]')
   starting at closePos
5. truncate(filePath, closePos + suffix.length)
   — this handles the case where the suffix is shorter than what was there
6. close()
```

**Visual:**
```
Before:                          After:
[                                [
  { "timestamp": "..." }           { "timestamp": "..." },
]                                  { "timestamp": "..." }
                                 ]
  ^closePos found here
```

**Pros:** Standard JSON, works with `JSON.parse`. **Cons:** Two file ops per write (stat + open), slightly more complex.

---

### 5.3 TxtWriter

**File structure:**
```
─────────────────────────────────────────
[2025-05-15T10:00:00Z] SESSION: abc  APP: myapp
params: {"environment":"dev"}
EVENTS (3):
  [0] REQUEST  GET https://api.example.com/users  200  45ms
  [1] CLICK  BUTTON#submit .btn-primary "Submit"
  [2] CONSOLE_ERROR  TypeError: x is not a function
─────────────────────────────────────────
```

**Per-event formatting:**

| Type | Format |
|------|--------|
| REQUEST | `REQUEST  {method} {url}  {status}  {duration}` |
| CLICK | `CLICK  {nodeName}#{id} .{classNames} "{inner}"` |
| CONSOLE_ERROR | `CONSOLE_ERROR  {message}` |
| CONSOLE_WARN | `CONSOLE_WARN  {message}` |
| DEBUG_MESSAGE | `DEBUG_MESSAGE  [{label}] {data}` |
| INPUT | `INPUT  {JSON.stringify(data)}` |

**Pros:** Human-readable, no tooling required to inspect. **Cons:** Cannot be machine-parsed reliably.

---

## 6. Data Models

### 6.1 Configuration (`RilogConfig`)

```
┌─────────────────────────────────────────────────┐
│ RilogConfig                                      │
├─────────────────┬───────────────────────────────┤
│ port            │ number          (default 3030) │
│ logsDir         │ string          (default ./logs)│
│ format          │ 'ndjson'|'json'|'txt'           │
│ maxFileSizeMB   │ number          (default 10)   │
│ timezone        │ string (IANA)   (default UTC)  │
│ cors.origins    │ string[]                        │
└─────────────────┴───────────────────────────────┘
```

### 6.2 LogEntry (written to file)

```
┌─────────────────────────────────────────────────┐
│ LogEntry                                         │
├─────────────────┬───────────────────────────────┤
│ timestamp       │ string (ISO 8601)              │
│ uToken          │ string (session id)            │
│ appName         │ string (raw, not slugified)    │
│ params?         │ Record<string, string>         │
│ events          │ IRilogEventItem[]              │
└─────────────────┴───────────────────────────────┘
```

### 6.3 IRilogEventItem

```
┌─────────────────────────────────────────────────┐
│ IRilogEventItem                                  │
├─────────────────┬───────────────────────────────┤
│ _id             │ string                         │
│ type            │ ERilogEvent (0–5)              │
│ date            │ string (Unix ms as string)     │
│ location        │ { origin: string|null,         │
│                 │   href: string|null }          │
│ data            │ union — see per-type shapes    │
└─────────────────┴───────────────────────────────┘
```

### 6.4 Event type union

```
ERilogEvent.REQUEST (0)
  └── IRilogRequestItem
        ├── _id: string
        ├── request: { url, method, headers, data?, location, localStorage, timestamp }
        ├── response: { data?, url, status?, timestamp }
        └── duration?: string | null

ERilogEvent.CLICK (1)
  └── IRilogClick { id, inner, nodeName, classNames }

ERilogEvent.INPUT (2)
  └── IRilogInput { type, value, nodeName, className, id, name, inputType }

ERilogEvent.CONSOLE_ERROR (3)
ERilogEvent.CONSOLE_WARN (5)
  └── IRilogConsoleData
        ├── level: 'warn' | 'error'
        ├── message: string
        ├── stackTrace?: string
        ├── source: 'console' | 'runtime' | 'unhandledRejection'
        ├── errorFile?: string
        ├── errorLine?: number
        └── errorColumn?: number

ERilogEvent.DEBUG_MESSAGE (4)
  └── IRilogMessageData
        ├── data: string
        ├── label: string
        ├── shouldBeParsed: boolean
        └── stackTrace?: string
```

---

## 7. API Reference

### `POST /api/events/save`

| | |
|---|---|
| **Content-Type** | `application/json` \| `text/plain` \| `application/octet-stream` |
| **Auth** | None |

**Request body:**

```typescript
{
  events : string;                      // JSON.stringify(IRilogEventItem[])
  uToken : string;                      // session token
  appName: string;                      // application identifier
  params?: Record<string, string>;      // optional metadata
}
```

**Success response (HTTP 200):**
```json
{ "result": "SUCCESS", "file": "logs/my-app/2025-05-15.log.ndjson" }
```

**Error response (HTTP 200):**
```json
{ "result": "ERROR", "message": "appName, uToken and events are required" }
```

Note: HTTP status is always 200. The `result` field carries success/failure.

---

### `GET /api/apps`

| | |
|---|---|
| **Auth** | None |

**Response (HTTP 200):**
```json
{
  "apps": ["my-app", "admin-panel"],
  "dates": {
    "my-app": ["2025-05-15", "2025-05-14"],
    "admin-panel": ["2025-05-15"]
  }
}
```

`apps` is a list of directory names under `logsDir` (slugified app names).
`dates` is sorted descending (newest first).

---

## 8. File System Layout

```
{logsDir}/                               ← config.logsDir, default: ./logs
  {slugifiedAppName}/                    ← created automatically on first write
    {YYYY-MM-DD}.log.{ext}              ← current file for today
    {YYYY-MM-DD}_part2.log.{ext}       ← created when part 1 ≥ maxFileSizeMB
    {YYYY-MM-DD}_part3.log.{ext}       ← created when part 2 ≥ maxFileSizeMB
    {YYYY-MM-DD-1}.log.{ext}           ← previous day (untouched)
```

**Slug rules:** `toLowerCase()` + `replace(/\s+/g, '-')`
Examples: `"My App"` → `"my-app"`, `"admin panel v2"` → `"admin-panel-v2"`

**Extension** is determined by `config.format`:
- `ndjson` → `.ndjson`
- `json` → `.json`
- `txt` → `.txt`

---

## 9. Module Dependency Graph

```
server.ts
  └── src/index.ts (Server class)
        ├── src/config/index.ts
        └── src/routes/index.ts
              ├── src/routes/events.routes.ts
              │     └── src/controllers/events.controller.ts
              │           ├── src/services/events.service.ts
              │           │     ├── src/writers/NdjsonWriter.ts ─┐
              │           │     ├── src/writers/JsonWriter.ts   ─┤── IFileWriter
              │           │     ├── src/writers/TxtWriter.ts    ─┘
              │           │     │     └── src/utils/events.ts
              │           │     └── src/services/fileRotator.ts
              │           │           └── src/config/index.ts
              │           └── src/types/rilog.ts
              └── src/routes/apps.routes.ts
                    └── src/controllers/apps.controller.ts
                          └── src/services/appsService.ts
                                └── src/config/index.ts
```

---

## 10. Startup Sequence

```
node dist/server.js
  │
  ▼
import { config } from './src/config'
  ├── loadConfig()
  │   ├── look for rilog-local-server.config.js at process.cwd()
  │   ├── found → require() + merge with defaults
  │   └── not found → use defaults
  └── config is frozen at module load time (no hot reload)
  │
  ▼
new Server(app)
  ├── app.use(cors(config.cors.origins))
  ├── app.use(express.json({ limit: '10mb' }))
  ├── app.use(express.text({ type: 'text/plain', limit: '10mb' }))
  ├── app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }))
  ├── app.use(express.urlencoded({ extended: true }))
  └── new Routes(app)
        ├── app.use('/api', eventsRoutes)   → POST /api/events/save
        └── app.use('/api', appsRoutes)     → GET /api/apps
  │
  ▼
app.listen(config.port, 'localhost')
  └── [rilog-local] Server is running on http://localhost:3030
```

---

## 11. Stdout Log Format

Every successfully written batch produces one line:

```
[rilog-local] 2025-05-15T14:22:01.000Z  app=my-app  events=7  file=logs/my-app/2025-05-15.log.ndjson
```

Fields:
- `app=` — raw appName from the request
- `events=` — number of `IRilogEventItem` in the batch
- `file=` — absolute or relative path of the file written to

---

## 12. Extension Points

| What to extend | Where to change |
|---------------|----------------|
| New log format | Add `XyzWriter.ts` in `src/writers/`, register in `events.service.ts` writers map, add to `RilogConfig.format` union |
| New event type | Add value to `ERilogEvent` in `src/types/rilog.ts`, add case to `getEventTypeLabel` in `src/utils/events.ts`, add render case in `TxtWriter.ts` |
| New API route | Add controller + route file, register in `src/routes/index.ts` |
| Serve log file contents | Add `GET /api/logs/:app/:date` using `fs.createReadStream` + `readline` for NDJSON |
| Auth/token | Add middleware in `src/index.ts` before route registration |
| Persist config changes at runtime | Replace `const config = loadConfig()` with a class that can re-read the file |
