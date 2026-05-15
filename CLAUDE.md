# CLAUDE.md — rilog-local-server

AI agent context file. Read this before touching any code in this repository.

---

## What this project is

`rilog-local-server` is a **zero-dependency local log sink** for the browser library `@rilog-development/rilog-lib`. Its only job: receive JSON batches of browser events over HTTP, serialize them to disk, and expose a lightweight API for a future dashboard. No database. No auth. No cloud.

It is part of the `rilog-development` monorepo ecosystem:
- **rilog-lib** — browser library that captures events (requests, clicks, inputs, console, debug messages) and POSTs them here
- **rilog-local-server** — this project (receives + persists)
- **rilog-dashboard** — planned web UI that reads files written by this server

---

## Repository layout

```
rilog-local-server/
├── server.ts                          # Entry point — listen on config.port
├── rilog-local-server.config.js       # User config (port, format, rotation, CORS, tz)
├── src/
│   ├── index.ts                       # Server class — middleware setup
│   ├── config/
│   │   └── index.ts                   # Config loader (merges user config + defaults)
│   ├── types/
│   │   ├── rilog.ts                   # All rilog-lib data shapes (ERilogEvent enum, IRilogEventItem, etc.)
│   │   └── events.ts                  # Server-internal types (LogEntry, SaveEventsRequest)
│   ├── writers/
│   │   ├── IFileWriter.ts             # Interface: { extension, write(path, LogEntry) }
│   │   ├── NdjsonWriter.ts            # Default: one JSON line per batch
│   │   ├── JsonWriter.ts              # Valid JSON array, in-place append
│   │   └── TxtWriter.ts               # Human-readable blocks with per-type formatting
│   ├── services/
│   │   ├── fileRotator.ts             # Single source of truth for current file path
│   │   ├── events.service.ts          # Builds LogEntry, delegates to fileRotator
│   │   └── appsService.ts             # Scans logsDir tree → {apps, dates}
│   ├── controllers/
│   │   ├── events.controller.ts       # POST /api/events/save
│   │   └── apps.controller.ts         # GET /api/apps
│   ├── routes/
│   │   ├── events.routes.ts
│   │   ├── apps.routes.ts
│   │   └── index.ts                   # Mounts both under /api
│   └── utils/
│       ├── date.ts                    # formatDate, formatTimestamp (legacy, only used by TxtWriter indirectly)
│       ├── events.ts                  # getEventTypeLabel, getEventRequestStatus
│       └── index.ts                   # getSlugName (appName → folder slug)
└── dist/                              # TypeScript output (gitignored)
```

---

## Data flow (one request)

```
Browser (rilog-lib)
  POST /api/events/save
  Content-Type: application/json | text/plain | application/octet-stream
        │
        ▼
  EventsController.saveEvents()
    1. Normalize body (Buffer → string → parse JSON)
    2. Validate: events + uToken + appName required
    3. JSON.parse(body.events) → IRilogEventItem[]
        │
        ▼
  EventsService.saveEvents()
    4. Build LogEntry { timestamp, uToken, appName, params, events }
        │
        ▼
  FileRotator.write(appName, entry, writer)   ← holds per-app Mutex
    5. Slugify appName → folder name
    6. Compute date string (Intl, configured timezone)
    7. Resolve file path (check size, increment part if needed)
    8. Create directory if missing
    9. writer.write(filePath, entry)
        │
        ▼
  NdjsonWriter | JsonWriter | TxtWriter
    10. Append to file
        │
        ▼
  Response: { result: "SUCCESS", file: "logs/app/2025-05-15.log.ndjson" }
```

---

## Critical invariants — do not break

1. **Response format is uppercase**: `{ result: "SUCCESS" }` or `{ result: "ERROR", message: "..." }`. rilog-lib checks `.toLowerCase() === 'success'` so case doesn't matter to the library, but the contract is uppercase here.

2. **`events` field is double-encoded**: The browser sends `JSON.stringify(array)` as a string inside the JSON body. The controller must `JSON.parse(body.events)` — never pass `body.events` directly to the writer.

3. **FileRotator mutex is per-appName**: Multiple apps can write concurrently; only same-app concurrent writes are serialized. Do not replace with a single global mutex.

4. **Date format in filenames is always `YYYY-MM-DD`** (ISO 8601 date). Changing this breaks `appsService.ts` regex `/^(\d{4}-\d{2}-\d{2})/` and dashboard file discovery.

5. **File size check happens inside the mutex**, before the write. Never check size outside the mutex and then write inside — the check must be atomic with the write.

6. **sendBeacon arrives as `text/plain` or `application/octet-stream`**. The server registers `express.text()` and `express.raw()` specifically for this. The controller checks `Buffer.isBuffer(req.body)` first, then `typeof req.body === 'string'`, then falls through to object (JSON).

---

## Configuration system

- `src/config/index.ts` exports `const config = loadConfig()` — loaded once at startup.
- `rilog-local-server.config.js` at project root is optional; missing file → defaults.
- Config is merged shallowly except `cors` which is merged separately.
- **No hot reload** — changing the config file requires a server restart.

```typescript
interface RilogConfig {
  port: number;           // default: 3030
  logsDir: string;        // default: './logs'
  format: 'json' | 'txt' | 'ndjson';  // default: 'ndjson'
  maxFileSizeMB: number;  // default: 10
  timezone: string;       // default: 'UTC' (IANA tz name)
  cors: { origins: string[] };
}
```

---

## Adding a new writer format

1. Create `src/writers/XyzWriter.ts` implementing `IFileWriter`.
2. Add to the `writers` map in `src/services/events.service.ts`.
3. Add the literal to `RilogConfig.format` union in `src/config/index.ts`.
4. No other changes needed.

---

## Adding a new API route

1. Create `src/controllers/xyz.controller.ts`.
2. Create `src/routes/xyz.routes.ts`.
3. Register in `src/routes/index.ts`.
4. If the route reads log files: use `fs/promises` and resolve paths relative to `config.logsDir`.

---

## ERilogEvent enum (numeric, keep in sync with rilog-lib)

```
0 → REQUEST        IRilogRequestItem
1 → CLICK          IRilogClick
2 → INPUT          IRilogInput
3 → CONSOLE_ERROR  IRilogConsoleData
4 → DEBUG_MESSAGE  IRilogMessageData
5 → CONSOLE_WARN   IRilogConsoleData
```

If rilog-lib adds new event types, add the numeric value to `ERilogEvent` in `src/types/rilog.ts` and add a label case in `src/utils/events.ts`.

---

## LogEntry — what is written to every file

```typescript
type LogEntry = {
  timestamp: string;              // ISO 8601, e.g. "2025-05-15T14:22:01.000Z"
  uToken: string;                 // session identifier from the browser
  appName: string;                // raw app name (not slugified)
  params?: Record<string,string>; // optional consumer metadata
  events: IRilogEventItem[];      // the decoded event array
}
```

Each file line (NDJSON) or array element (JSON) is one `LogEntry` — one batch from one browser call.

---

## File naming convention

```
<logsDir>/
  <slugified-appName>/
    <YYYY-MM-DD>.log.<ext>
    <YYYY-MM-DD>_part2.log.<ext>
    <YYYY-MM-DD>_part3.log.<ext>
```

- `slugify(appName)` = `appName.toLowerCase().replace(/\s+/g, '-')`
- Date is computed with `Intl.DateTimeFormat` in `config.timezone`
- `_part2`, `_part3` etc. are created when the previous part reaches `config.maxFileSizeMB`

---

## Build & dev commands

```bash
npm run build          # tsc → dist/
npm run dev            # tsc + node dist/server.js
npm run start          # nodemon src/index.ts (dev with auto-reload)
```

TypeScript strict mode is on. All code must pass `tsc` with zero errors.

---

## Dependencies (runtime only)

| Package | Why |
|---------|-----|
| `express` | HTTP server |
| `cors` | CORS headers |
| `async-mutex` | Per-app write serialization |

No ORM, no database driver, no logging library, no validation library. Keep it this way.

---

## Things to watch out for

- `src/utils/date.ts` still exists but is not used by the main write path (only potentially available for future formatters). Do not delete it — it may be imported by tests.
- `nodemon.json` starts `src/index.ts` (the Server class), not `server.ts`. The `npm run start` command is for dev; `npm run dev` builds first, then runs the compiled output.
- `config.logsDir` is relative to `process.cwd()` (the project root), resolved by `path.resolve` in `fileRotator.ts`. When deploying, ensure the working directory is set correctly.
- The `dist/` folder is in `.gitignore` — never commit compiled output.
