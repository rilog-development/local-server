# INSTRUCTIONS.md — Dashboard Implementation Guide

This document is a detailed specification and implementation prompt for building the **rilog-dashboard** — a web UI that reads, displays, and filters log files produced by `rilog-local-server`.

---

## Context

`rilog-local-server` runs on `localhost:3030` and persists browser event batches to local disk in NDJSON format (default). Each line in a `.log.ndjson` file is one serialized `LogEntry` object.

The dashboard talks to the server via two existing API endpoints and will need additional endpoints to serve file contents. It is a **read-only** consumer — it never writes to log files.

---

## What a `LogEntry` looks like (the unit of data)

```jsonc
{
  "timestamp": "2025-05-15T14:22:01.000Z",   // when this batch arrived at the server
  "uToken": "abc-123-uuid",                   // browser session identifier
  "appName": "my-frontend-app",               // raw app name
  "params": { "environment": "dev" },         // optional consumer metadata
  "events": [
    {
      "_id": "evt-001",
      "type": 0,                              // ERilogEvent.REQUEST
      "date": "1747314121000",               // Unix ms as string
      "location": { "origin": "http://localhost:3000", "href": "http://localhost:3000/dashboard" },
      "data": {
        "_id": "req-001",
        "request":  { "url": "https://api.example.com/users", "method": "GET", "headers": {}, "localStorage": null, "timestamp": 1747314120000 },
        "response": { "url": "https://api.example.com/users", "status": "200", "timestamp": 1747314121000 },
        "duration": "45ms"
      }
    },
    {
      "_id": "evt-002",
      "type": 1,                              // ERilogEvent.CLICK
      "date": "1747314122000",
      "location": { "origin": "http://localhost:3000", "href": "http://localhost:3000/dashboard" },
      "data": { "id": "submit-btn", "inner": "Submit", "nodeName": "BUTTON", "classNames": "btn btn-primary" }
    }
  ]
}
```

### Event type enum (numbers, not strings)

| Value | Name | data shape |
|-------|------|-----------|
| 0 | REQUEST | `{ _id, request: { url, method, headers, data?, localStorage, timestamp }, response: { data?, url, status?, timestamp }, duration? }` |
| 1 | CLICK | `{ id, inner, nodeName, classNames }` |
| 2 | INPUT | `{ type, value, nodeName, className, id, name, inputType }` |
| 3 | CONSOLE_ERROR | `{ level, message, stackTrace?, source, errorFile?, errorLine?, errorColumn? }` |
| 4 | DEBUG_MESSAGE | `{ data, label, shouldBeParsed, stackTrace? }` |
| 5 | CONSOLE_WARN | `{ level, message, stackTrace?, source, errorFile?, errorLine?, errorColumn? }` |

---

## Existing API endpoints (already implemented)

### `GET /api/apps`

Returns the directory tree of available logs:

```json
{
  "apps": ["my-frontend-app", "admin-panel"],
  "dates": {
    "my-frontend-app": ["2025-05-15", "2025-05-14", "2025-05-13"],
    "admin-panel": ["2025-05-15"]
  }
}
```

### `POST /api/events/save`

Receives batches from rilog-lib. The dashboard does NOT call this endpoint.

---

## New API endpoints to implement on the server

Add these to `rilog-local-server` before building the dashboard frontend.

### `GET /api/logs/:appName/:date`

Returns all `LogEntry` objects for a given app + date (across all parts).

**Behavior:**
1. Resolve `config.logsDir/<slugify(appName)>/<date>.log.<ext>`, `<date>_part2.log.<ext>`, etc.
2. Read all matching part files.
3. Parse NDJSON (one line → one object) or JSON array or TXT depending on config format.
4. Return the concatenated array.

**Response:**

```json
{
  "entries": [ ...LogEntry[] ],
  "meta": {
    "app": "my-frontend-app",
    "date": "2025-05-15",
    "parts": 2,
    "totalBatches": 847,
    "totalEvents": 3214
  }
}
```

**Notes:**
- Support streaming for large files (NDJSON is line-by-line, ideal for `readline` interface).
- Add query param `?format=ndjson` as a hint if the server might have mixed formats.
- Files can be up to `maxFileSizeMB` (default 10 MB) each, multiple parts.

### `GET /api/logs/:appName/:date/stream` (optional, recommended for large files)

SSE or chunked response streaming NDJSON lines as they are read. Allows the dashboard to render results progressively.

### `GET /api/logs/:appName/:date/sessions`

Returns a list of unique `uToken` values for a given day, with stats:

```json
{
  "sessions": [
    { "uToken": "abc-123", "batches": 12, "events": 87, "firstSeen": "2025-05-15T10:00:00Z", "lastSeen": "2025-05-15T11:30:00Z" }
  ]
}
```

---

## Dashboard — required features

### 1. App & Date Selector (sidebar / top navigation)
- Call `GET /api/apps` on load.
- Show list of apps (slugified folder names).
- For selected app, show calendar or date list of available log days.
- Highlight today's date.

### 2. Session Timeline
- After selecting app + date, call `GET /api/logs/:appName/:date`.
- Group `LogEntry` objects by `uToken`.
- Show sessions as rows, sorted by `firstSeen`.
- Each session row: token (truncated), time range, count of events by type (badge counts).
- Clicking a session expands the event list for that session.

### 3. Event List / Event Log
- Flat chronological list of events within a selected session (or all sessions).
- Each row shows:
  - Relative timestamp (e.g. `+1.2s` from session start)
  - Event type badge (color-coded)
  - Summary (URL for REQUEST, element for CLICK, message for CONSOLE)
- Clicking an event opens a detail drawer/modal with the full `data` payload as formatted JSON.

### 4. Filter Bar
Filters should work client-side (after data is loaded):
- **By event type**: checkboxes for REQUEST, CLICK, INPUT, CONSOLE_ERROR, CONSOLE_WARN, DEBUG_MESSAGE
- **By session (uToken)**: dropdown / search
- **By URL pattern** (for REQUEST events): text input, substring match
- **By status code** (for REQUEST events): select (200, 4xx, 5xx, network_error)
- **By label** (for DEBUG_MESSAGE): text input
- **By page (href)**: substring match on `location.href`

### 5. Request Inspector
Specialized view for `type: 0` (REQUEST) events:
- Request: method badge, URL, headers (collapsible), body (collapsible), timestamp
- Response: status badge (colored: green 2xx, orange 3xx, red 4xx/5xx), body, duration
- `localStorage` snapshot if present (parsed JSON, shown as key-value table)

### 6. Console Panel
Dedicated view for `type: 3` (CONSOLE_ERROR) and `type: 5` (CONSOLE_WARN):
- Error message
- Stack trace (collapsible, monospace)
- Source: `console` | `runtime` | `unhandledRejection`
- File + line + column if available

### 7. Debug Messages Panel
For `type: 4` (DEBUG_MESSAGE):
- Label as badge
- Data field: if `shouldBeParsed === true`, try to pretty-print as JSON; otherwise show as raw string
- Stack trace (collapsible)

### 8. Stats / Summary Bar
At the top of any loaded day:
- Total batches, total events, unique sessions
- Event type breakdown as a mini bar chart or pie chart
- Most-errored page URLs
- Average request duration (for REQUEST events)

---

## Recommended tech stack

| Concern | Recommendation | Reason |
|---------|---------------|--------|
| Framework | **React 18** or **Svelte 5** | Component model fits the event list pattern |
| Build | **Vite** | Fast HMR, zero-config for local dev |
| Styling | **Tailwind CSS** | Rapid utility styling, no CSS overhead |
| State | **Zustand** or React `useReducer` | Simple enough for this app, no backend sync needed |
| Data fetching | Native `fetch` + `useEffect` / TanStack Query | Lightweight; no complex caching needed |
| Code highlighting | **Shiki** or **Prism** | For JSON payloads and stack traces |
| Date handling | **date-fns** | Lightweight, tree-shakeable |
| Charts | **Recharts** (React) or **Chart.js** | For the stats summary bar |
| Virtualization | **TanStack Virtual** | Essential for rendering thousands of events without lag |

**Do not use**: heavy UI kits (MUI, Ant Design). The dashboard is read-only and simple — bespoke components are cleaner.

---

## Architecture recommendations

### Parsing NDJSON in the browser

```typescript
// Parse NDJSON text into LogEntry[]
function parseNdjson(text: string): LogEntry[] {
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => JSON.parse(line));
}
```

### Flattening batches into a flat event stream

```typescript
interface FlatEvent {
  batchTimestamp: string;
  uToken: string;
  appName: string;
  params?: Record<string, string>;
  event: IRilogEventItem;
  eventIndex: number;
}

function flatten(entries: LogEntry[]): FlatEvent[] {
  return entries.flatMap(entry =>
    entry.events.map((event, i) => ({
      batchTimestamp: entry.timestamp,
      uToken: entry.uToken,
      appName: entry.appName,
      params: entry.params,
      event,
      eventIndex: i,
    }))
  );
}
```

### Grouping by session

```typescript
function groupBySession(flat: FlatEvent[]): Map<string, FlatEvent[]> {
  return flat.reduce((map, item) => {
    const list = map.get(item.uToken) ?? [];
    list.push(item);
    map.set(item.uToken, list);
    return map;
  }, new Map<string, FlatEvent[]>());
}
```

### Color coding event types

```typescript
const EVENT_COLORS: Record<number, string> = {
  0: '#3B82F6',  // REQUEST — blue
  1: '#10B981',  // CLICK — green
  2: '#8B5CF6',  // INPUT — purple
  3: '#EF4444',  // CONSOLE_ERROR — red
  4: '#F59E0B',  // DEBUG_MESSAGE — amber
  5: '#F97316',  // CONSOLE_WARN — orange
};
```

---

## UX guidelines

- **Dark mode first**: log viewers are developer tools; dark mode is expected.
- **Keyboard navigation**: `j`/`k` to move between events, `Enter` to expand, `Escape` to close detail.
- **Auto-refresh**: poll `GET /api/apps` every 5 seconds so new log days appear without reload.
- **Persist selection in URL**: `?app=my-app&date=2025-05-15&session=abc-123` so links are shareable.
- **Virtual list**: never render all events in the DOM; use virtualization for lists > 100 items.
- **Error boundaries**: if one event's `data` is malformed JSON, catch and display a fallback instead of crashing the list.

---

## File serving — important note for the server implementer

When implementing `GET /api/logs/:appName/:date`, use Node's `readline` interface for NDJSON files to avoid loading entire files into memory:

```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function* readNdjson(filePath: string) {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line);
  }
}
```

For the JSON array format (`JsonWriter`), do NOT stream — read the whole file and `JSON.parse` it.

---

## Dashboard folder structure (suggested)

```
rilog-dashboard/
├── src/
│   ├── api/
│   │   ├── apps.ts          # GET /api/apps
│   │   └── logs.ts          # GET /api/logs/:app/:date
│   ├── components/
│   │   ├── AppSelector.tsx
│   │   ├── DatePicker.tsx
│   │   ├── SessionList.tsx
│   │   ├── EventList.tsx
│   │   ├── EventRow.tsx
│   │   ├── EventDetail/
│   │   │   ├── RequestDetail.tsx
│   │   │   ├── ConsoleDetail.tsx
│   │   │   ├── ClickDetail.tsx
│   │   │   └── DebugDetail.tsx
│   │   ├── FilterBar.tsx
│   │   └── StatsBar.tsx
│   ├── hooks/
│   │   ├── useLogs.ts
│   │   ├── useApps.ts
│   │   └── useFilter.ts
│   ├── store/
│   │   └── useStore.ts
│   ├── types/
│   │   └── rilog.ts         # Copy/share from rilog-local-server
│   └── utils/
│       ├── parseNdjson.ts
│       ├── flattenEntries.ts
│       └── eventColors.ts
├── index.html
├── vite.config.ts
└── package.json
```

---

## CORS

The server is already configured to allow requests from `config.cors.origins`. The dashboard dev server runs on `http://localhost:5173` (Vite default) — add it to the server's config:

```js
// rilog-local-server.config.js
module.exports = {
  cors: {
    origins: ['http://localhost:3000', 'http://localhost:5173'],
  },
};
```

---

## Summary checklist

Before starting the dashboard, implement on the server:

- [ ] `GET /api/logs/:appName/:date` — returns all LogEntry objects for app+date
- [ ] `GET /api/logs/:appName/:date/sessions` — returns session index
- [ ] NDJSON streaming via readline (memory-safe)
- [ ] Handle multi-part files (`_part2`, `_part3`, ...)

Then build the dashboard:

- [ ] App + date selector
- [ ] Session grouping and list
- [ ] Virtual event list with filter bar
- [ ] Per-type detail views (Request, Console, Click, Input, Debug)
- [ ] Stats summary
- [ ] Dark mode
- [ ] URL-based state persistence
- [ ] Keyboard navigation
