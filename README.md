# rilog-local-server

**Local file storage server for [@rilog-development/rilog-lib](https://github.com/rilog-development/rilog-lib).**

Captures browser event batches (HTTP requests, clicks, console errors, debug messages) sent by rilog-lib and saves them to structured log files on your disk. No database. No cloud. No auth.

---

## How it works

```
Your browser app (rilog-lib)
   │  POST /api/events/save
   ▼
rilog-local-server :3030
   │  writes to disk
   ▼
logs/
  your-app/
    2025-05-15.log.ndjson
```

Each write creates or appends to a date-based file. When a file reaches the configured size limit, a new part is started automatically (`_part2`, `_part3`, …).

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/rilog-development/rilog-local-server.git
cd rilog-local-server
npm install

# 2. Start (development mode — auto-reload on file changes)
npm run start

# 3. Or build and run compiled output
npm run build
npm run dev
```

Server starts on **http://localhost:3030**.

---

## Configuration

Create `rilog-local-server.config.js` in the project root. All fields are optional — the defaults below are used if the file is missing.

```js
// rilog-local-server.config.js
module.exports = {
  port: 3030,              // HTTP port
  logsDir: './logs',       // where to store log files
  format: 'ndjson',        // 'ndjson' (default) | 'json' | 'txt'
  maxFileSizeMB: 10,       // rotate to a new file after this size
  timezone: 'UTC',         // IANA timezone for date filenames, e.g. 'Europe/Kyiv'
  cors: {
    origins: ['http://localhost:3000'],  // allowed frontend origins
  },
};
```

After changing the config, restart the server.

### Config examples

**Multiple frontends on different ports:**
```js
module.exports = {
  cors: { origins: ['http://localhost:3000', 'http://localhost:5173'] },
};
```

**Local timezone, smaller files:**
```js
module.exports = {
  timezone: 'Europe/Kyiv',
  maxFileSizeMB: 5,
};
```

**Plain-text logs for easy reading:**
```js
module.exports = { format: 'txt' };
```

---

## Browser-side setup (rilog-lib)

```ts
import rilog from '@rilog-development/rilog-lib';

rilog.init({
  config: {
    localServer: {
      appName: 'my-frontend-app',           // used for folder name
      params: {                             // optional — saved with every batch
        environment: 'development',
        branch: 'main',
      },
    },
  },
});
```

Start rilog-local-server **before** your frontend dev server. The library will POST to `http://localhost:3030/api/events/save` automatically whenever it has accumulated events, and also sends a final batch via `navigator.sendBeacon` on page unload.

---

## Log file formats

### NDJSON (default) — `format: 'ndjson'`

One JSON object per line. Each line is one batch (one POST from the browser).

```jsonl
{"timestamp":"2025-05-15T14:22:01.000Z","uToken":"abc-123","appName":"my-app","params":{"env":"dev"},"events":[{"_id":"e1","type":0,"date":"1747314121000","location":{"origin":"http://localhost:3000","href":"http://localhost:3000/dashboard"},"data":{"_id":"r1","request":{"url":"https://api.example.com/users","method":"GET","headers":{},"localStorage":null,"timestamp":1747314120000},"response":{"url":"https://api.example.com/users","status":"200","timestamp":1747314121000},"duration":"45ms"}}]}
{"timestamp":"2025-05-15T14:22:05.000Z","uToken":"abc-123","appName":"my-app","events":[...]}
```

**Best for:** Streaming, large files, future dashboard integration.

**Read with Node.js:**
```js
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({ input: createReadStream('logs/my-app/2025-05-15.log.ndjson') });
for await (const line of rl) {
  const entry = JSON.parse(line);
  console.log(entry.uToken, entry.events.length);
}
```

---

### JSON array — `format: 'json'`

Standard JSON array of batch objects. Valid JSON throughout — no full file load needed for appending.

```json
[
  {
    "timestamp": "2025-05-15T14:22:01.000Z",
    "uToken": "abc-123",
    "appName": "my-app",
    "events": [...]
  },
  {
    "timestamp": "2025-05-15T14:22:05.000Z",
    "uToken": "abc-123",
    "appName": "my-app",
    "events": [...]
  }
]
```

**Best for:** Quick inspection with `JSON.parse`, compatibility with tools that expect JSON files.

---

### Plain text — `format: 'txt'`

Human-readable blocks, one per batch.

```
─────────────────────────────────────────
[2025-05-15T14:22:01.000Z] SESSION: abc-123  APP: my-app
params: {"environment":"development","branch":"main"}
EVENTS (4):
  [0] REQUEST  GET https://api.example.com/users  200  45ms
  [1] REQUEST  POST https://api.example.com/login  401
  [2] CLICK  BUTTON#submit .btn .btn-primary "Sign In"
  [3] CONSOLE_ERROR  TypeError: Cannot read properties of undefined
─────────────────────────────────────────
```

**Best for:** Tailing logs in a terminal, sharing snippets, quick human review.

```bash
tail -f logs/my-app/2025-05-15.log.txt
```

---

## File layout

```
logs/
  my-frontend-app/          ← one folder per app (name is slugified)
    2025-05-14.log.ndjson   ← yesterday (complete, untouched)
    2025-05-15.log.ndjson   ← today part 1 (up to maxFileSizeMB)
    2025-05-15_part2.log.ndjson  ← today part 2 (created when part 1 is full)
  admin-panel/
    2025-05-15.log.ndjson
```

---

## API endpoints

### `POST /api/events/save`

The endpoint rilog-lib calls. Accepts `application/json` (normal requests) and `text/plain` / `application/octet-stream` (sendBeacon on page unload).

**Example with curl:**
```bash
curl -X POST http://localhost:3030/api/events/save \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "test-app",
    "uToken": "session-001",
    "events": "[{\"_id\":\"e1\",\"type\":1,\"date\":\"1747314121000\",\"location\":{\"origin\":\"http://localhost:3000\",\"href\":\"http://localhost:3000\"},\"data\":{\"id\":\"btn\",\"inner\":\"Click me\",\"nodeName\":\"BUTTON\",\"classNames\":\"btn\"}}]"
  }'
```

**Response:**
```json
{ "result": "SUCCESS", "file": "logs/test-app/2025-05-15.log.ndjson" }
```

---

### `GET /api/apps`

Returns all apps and their available log dates. Used by the dashboard.

```bash
curl http://localhost:3030/api/apps
```

```json
{
  "apps": ["my-frontend-app", "admin-panel"],
  "dates": {
    "my-frontend-app": ["2025-05-15", "2025-05-14"],
    "admin-panel": ["2025-05-15"]
  }
}
```

---

## Event types captured by rilog-lib

| Type | # | What it records |
|------|---|----------------|
| REQUEST | 0 | HTTP requests + responses (URL, method, status, duration, body) |
| CLICK | 1 | DOM click events (element tag, id, classes, text) |
| INPUT | 2 | Form input blur events (field name, type, value) |
| CONSOLE_ERROR | 3 | `console.error`, uncaught exceptions, unhandled rejections (message + stack trace) |
| DEBUG_MESSAGE | 4 | Manual `rilog.logData(label, data)` calls from your code |
| CONSOLE_WARN | 5 | `console.warn` calls |

---

## Practical examples

### Watch events arrive in real time

```bash
# NDJSON — watch new lines appear
tail -f logs/my-app/2025-05-15.log.ndjson | while read line; do
  echo "$line" | python3 -m json.tool --compact
done
```

### Count events by type for today

```bash
cat logs/my-app/2025-05-15.log.ndjson | \
  node -e "
    const rl = require('readline').createInterface({ input: process.stdin });
    const counts = {};
    rl.on('line', l => {
      const { events } = JSON.parse(l);
      events.forEach(e => counts[e.type] = (counts[e.type] || 0) + 1);
    });
    rl.on('close', () => console.log(counts));
  "
# { '0': 142, '1': 38, '3': 5 }
```

### Find all 4xx/5xx requests

```bash
cat logs/my-app/2025-05-15.log.ndjson | \
  node -e "
    const rl = require('readline').createInterface({ input: process.stdin });
    rl.on('line', l => {
      const { events, uToken } = JSON.parse(l);
      events
        .filter(e => e.type === 0 && e.data.response?.status?.match(/^[45]/))
        .forEach(e => console.log(uToken, e.data.request.method, e.data.request.url, e.data.response.status));
    });
  "
```

### List all unique sessions for a day

```bash
cat logs/my-app/2025-05-15.log.ndjson | \
  node -e "
    const rl = require('readline').createInterface({ input: process.stdin });
    const sessions = new Set();
    rl.on('line', l => sessions.add(JSON.parse(l).uToken));
    rl.on('close', () => { sessions.forEach(s => console.log(s)); console.log('Total:', sessions.size); });
  "
```

### Extract all console errors

```bash
cat logs/my-app/2025-05-15.log.ndjson | \
  node -e "
    const rl = require('readline').createInterface({ input: process.stdin });
    rl.on('line', l => {
      const { events, uToken } = JSON.parse(l);
      events
        .filter(e => e.type === 3)
        .forEach(e => console.log('[' + uToken + ']', e.data.message));
    });
  "
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Dev mode — nodemon watches `src/`, restarts on changes (ts-node) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run dev` | Build + run compiled output |
| `npm run test` | Run Jest tests |

---

## Dependencies

| Package | Role |
|---------|------|
| `express` | HTTP server |
| `cors` | CORS headers |
| `async-mutex` | Prevents race conditions on concurrent writes to the same app |

No database. No external services. Works fully offline.

---

## Troubleshooting

**Port already in use:**
```
[rilog-local] Error: port 3030 is already in use
```
Change `port` in `rilog-local-server.config.js` or kill the process using that port.

**CORS error in browser console:**
Add your frontend's origin to `cors.origins` in `rilog-local-server.config.js`, then restart.

**No events arriving:**
- Check that rilog-lib is configured with `localServer` mode.
- Confirm the server is running (`curl http://localhost:3030/api/apps`).
- Check the server's stdout for incoming request logs.

**Logs not visible in `/api/apps`:**
The endpoint scans `logsDir` for directories. Ensure logs have been written at least once and the path in config matches the actual write location.
