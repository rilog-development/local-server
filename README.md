# rilog-local-server

**Self-hosted log sink for [@rilog-development/rilog-lib](https://github.com/rilog-development/rilog-lib).**

Captures browser event batches (HTTP requests, clicks, console errors, debug messages) sent by rilog-lib and saves them to structured log files on your disk. No database. No cloud. Runs entirely on your own infrastructure.

---

## Table of contents

- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
  - [Config file](#config-file)
  - [Environment variables](#environment-variables)
- [Deployment](#deployment)
  - [Docker (recommended)](#docker-recommended)
  - [Manual — PM2](#manual--pm2)
  - [Manual — systemd](#manual--systemd)
- [Storage monitoring](#storage-monitoring)
- [Connecting rilog-lib](#connecting-rilog-lib)
- [Log file formats](#log-file-formats)
- [API endpoints](#api-endpoints)
- [Event types](#event-types)
- [Troubleshooting](#troubleshooting)

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

The dashboard is served at `/` from the same port. No separate web server needed.

---

## Quick start

### Production / self-hosting (Docker — recommended)

Three commands to get the server running on your machine or VPS:

```bash
git clone https://github.com/rilog-development/rilog-local-server.git
cd rilog-local-server
cp .env.example .env          # edit .env with your settings (see Configuration below)
docker compose up -d --build
```

Server + dashboard are now available at **http://your-server:3030**.

Log files are written to **`./logs/`** on the host machine, right next to `docker-compose.yml`.

### Local development (without Docker)

```bash
git clone https://github.com/rilog-development/rilog-local-server.git
cd rilog-local-server

npm install
npm run dashboard:install

npm run start   # auto-reload on file changes (ts-node + nodemon)
```

For a production build locally:
```bash
npm run build && npm run dashboard:build && npm run dev
```

Server + dashboard are available at **http://localhost:3030**.

---

## Configuration

Configuration is read from two sources that are merged at startup. **Environment variables always take priority over the config file.**

### Config file

Create `rilog-local-server.config.js` in the project root. The file is optional — defaults are used if it is missing.

```js
// rilog-local-server.config.js
module.exports = {
  port: 3030,              // HTTP port the server listens on
  logsDir: './logs',       // where log files are written (relative to project root)
  format: 'ndjson',        // 'ndjson' (default) | 'json' | 'txt'
  maxFileSizeMB: 10,       // start a new part file when this size is reached
  timezone: 'UTC',         // IANA timezone used in log file date names
  cors: {
    origins: [             // frontend origins allowed to POST events
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  },
  auth: {
    enabled: false,        // set true to require a password for the dashboard
    password: '',          // use RILOG_AUTH_PASSWORD env var instead of putting it here
  },
};
```

After changing the config file, restart the server.

### Environment variables

All settings can be set or overridden via environment variables. This is the recommended approach for **server deployments** — never put secrets in the config file.

**Server**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RILOG_PORT` | number | `3030` | HTTP port |
| `RILOG_HOST` | string | `0.0.0.0` | Bind address (`0.0.0.0` for Docker/remote, `127.0.0.1` for local-only) |
| `RILOG_LOGS_DIR` | string | `./logs` | Directory for log files |
| `RILOG_FORMAT` | string | `ndjson` | Log format: `ndjson`, `json`, or `txt` |
| `RILOG_MAX_FILE_SIZE_MB` | number | `10` | Max file size per log file before rotating to `_part2` |
| `RILOG_TIMEZONE` | string | `UTC` | IANA timezone for file date names, e.g. `Europe/Kyiv` |
| `RILOG_CORS_ORIGINS` | string | — | Comma-separated allowed origins, e.g. `https://app.example.com,https://admin.example.com` |
| `RILOG_AUTH_ENABLED` | boolean | `false` | Set `true` to require a password for the dashboard |
| `RILOG_AUTH_PASSWORD` | string | — | Dashboard password (takes priority over config file) |

**Storage monitoring** (see [Storage monitoring](#storage-monitoring) for details)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RILOG_MAX_TOTAL_SIZE_MB` | number | `1024` | Total size threshold across all apps |
| `RILOG_STORAGE_CHECK_INTERVAL_HOURS` | number | `1` | How often to check storage size |
| `RILOG_ON_EXCEEDED` | string | `warn` | Action: `warn`, `cleanup`, `email`, `cleanup+email` |

**SMTP — for email alerts** (optional, only needed with `email` strategy)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RILOG_SMTP_HOST` | string | — | SMTP server, e.g. `smtp.gmail.com` |
| `RILOG_SMTP_PORT` | number | `587` | SMTP port |
| `RILOG_SMTP_SECURE` | boolean | `false` | `true` for SSL (port 465) |
| `RILOG_SMTP_USER` | string | — | SMTP username |
| `RILOG_SMTP_PASS` | string | — | SMTP password or app-specific password |
| `RILOG_SMTP_FROM` | string | — | Sender email address |
| `RILOG_SMTP_TO` | string | — | Recipient email address for alerts |

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

`.env` is gitignored — it will never be committed.

### All config file options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3030` | HTTP port |
| `logsDir` | `string` | `'./logs'` | Directory for log files, relative to CWD |
| `format` | `'ndjson' \| 'json' \| 'txt'` | `'ndjson'` | Log file format |
| `maxFileSizeMB` | `number` | `10` | Max file size per file before rotating to `_part2` |
| `timezone` | `string` | `'UTC'` | IANA timezone for file date names |
| `cors.origins` | `string[]` | `['http://localhost:3000', 'http://localhost:5173']` | Allowed frontend origins |
| `auth.enabled` | `boolean` | `false` | Require password to access the dashboard |
| `auth.password` | `string` | `''` | Dashboard password — prefer `RILOG_AUTH_PASSWORD` env var |
| `storage.maxTotalSizeMB` | `number` | `1024` | Total log size threshold across all apps |
| `storage.checkIntervalHours` | `number` | `1` | How often to check storage size (hours) |
| `storage.onExceeded` | `string` | `'warn'` | Action on threshold exceeded: `warn`, `cleanup`, `email`, `cleanup+email` |
| `smtp.host` | `string` | `''` | SMTP server hostname |
| `smtp.port` | `number` | `587` | SMTP port |
| `smtp.secure` | `boolean` | `false` | `true` for SSL/port 465 |
| `smtp.user` | `string` | `''` | SMTP username — prefer `RILOG_SMTP_USER` env var |
| `smtp.pass` | `string` | `''` | SMTP password — prefer `RILOG_SMTP_PASS` env var |
| `smtp.from` | `string` | `''` | Sender email address |
| `smtp.to` | `string` | `''` | Recipient email address for alerts |

> **Security:** never put passwords or SMTP credentials in the config file if it is committed to version control. Use environment variables for all secrets.

---

## Deployment

### Docker (recommended)

The easiest and most portable way to self-host. One container includes both the server and the dashboard.

**Prerequisites:** Docker and Docker Compose installed on your server.

#### 1. Clone the repository

```bash
git clone https://github.com/rilog-development/rilog-local-server.git
cd rilog-local-server
```

#### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
RILOG_PORT=3030
RILOG_TIMEZONE=Europe/Kyiv
RILOG_CORS_ORIGINS=https://your-app.example.com
RILOG_AUTH_ENABLED=true
RILOG_AUTH_PASSWORD=your-strong-password
```

#### 3. Build and start

```bash
docker compose up -d --build
```

The server and dashboard are now available at `http://your-server:3030`.

#### Where log files are stored

After the first events arrive, your server directory will look like this:

```
/your/server/rilog-local-server/
├── docker-compose.yml
├── .env
└── logs/                          ← created automatically on first write
    ├── my-frontend-app/
    │   ├── 2025-05-15.log.ndjson
    │   └── 2025-05-16.log.ndjson
    └── admin-panel/
        └── 2025-05-16.log.ndjson
```

Logs are on the **host machine** (not inside the container) — you can read, copy, or back them up directly:

```bash
# browse all apps and dates
ls -lh logs/my-frontend-app/

# stream events as they arrive
tail -f logs/my-frontend-app/2025-05-16.log.ndjson

# pretty-print a log entry
head -1 logs/my-frontend-app/2025-05-16.log.ndjson | python3 -m json.tool
```

To change the storage path, edit the volume line in `docker-compose.yml`:

```yaml
volumes:
  - /data/rilog-logs:/app/logs    # absolute host path : container path
```

#### Common Docker commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Check health
docker compose ps
```

#### Exposing via nginx reverse proxy

If you run nginx on your server, add a site config:

```nginx
server {
    listen 80;
    server_name rilog.your-domain.com;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Then obtain a TLS certificate:
```bash
certbot --nginx -d rilog.your-domain.com
```

Point `RILOG_CORS_ORIGINS` to your frontend domain and the dashboard will be available at `https://rilog.your-domain.com`.

---

### Manual — PM2

PM2 keeps the process running and restarts it on crash or server reboot.

#### 1. Install Node.js 20+ on your server

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Clone and build

```bash
git clone https://github.com/rilog-development/rilog-local-server.git
cd rilog-local-server

npm install
npm run build

npm run dashboard:install
npm run dashboard:build
```

#### 3. Set environment variables

```bash
cp .env.example .env
# edit .env with your values
```

#### 4. Install PM2 and start the server

```bash
npm install -g pm2

# Start with env file
pm2 start dist/server.js --name rilog-local-server --env-file .env

# Save process list so it survives reboots
pm2 save
pm2 startup    # follow the printed instructions
```

#### PM2 commands

```bash
pm2 status                    # check running processes
pm2 logs rilog-local-server   # stream logs
pm2 restart rilog-local-server
pm2 stop rilog-local-server
```

---

### Manual — systemd

For servers where you prefer native system service management.

#### 1. Clone and build (same as PM2 steps 1–3 above)

#### 2. Create a systemd unit file

```bash
sudo nano /etc/systemd/system/rilog-local-server.service
```

Paste (adjust paths and user as needed):

```ini
[Unit]
Description=rilog-local-server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/rilog-local-server
EnvironmentFile=/opt/rilog-local-server/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

#### 3. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable rilog-local-server
sudo systemctl start rilog-local-server
```

#### systemd commands

```bash
sudo systemctl status rilog-local-server
sudo journalctl -u rilog-local-server -f   # stream logs
sudo systemctl restart rilog-local-server
```

---

## Storage monitoring

The server checks total log size on startup and then on a configurable interval. When the total size exceeds the threshold, one or more actions are taken depending on `RILOG_ON_EXCEEDED`.

### Strategies

| Value | Behaviour |
|-------|-----------|
| `warn` (default) | Prints a warning to stdout / container logs. No files are deleted. |
| `cleanup` | Deletes the **oldest** log files first until total size drops below 80% of the threshold. |
| `email` | Sends an email alert via SMTP. Requires SMTP settings. |
| `cleanup+email` | Both cleanup and email. |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RILOG_MAX_TOTAL_SIZE_MB` | `1024` | Threshold in MB across all projects combined |
| `RILOG_STORAGE_CHECK_INTERVAL_HOURS` | `1` | How often to check (in hours) |
| `RILOG_ON_EXCEEDED` | `warn` | Strategy: `warn`, `cleanup`, `email`, `cleanup+email` |

### Email alerts via SMTP

Set `RILOG_ON_EXCEEDED=email` (or `cleanup+email`) and configure SMTP:

| Variable | Description |
|----------|-------------|
| `RILOG_SMTP_HOST` | SMTP server hostname, e.g. `smtp.gmail.com` |
| `RILOG_SMTP_PORT` | Port — usually `587` (STARTTLS) or `465` (SSL) |
| `RILOG_SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `RILOG_SMTP_USER` | SMTP login (your email address) |
| `RILOG_SMTP_PASS` | SMTP password or app-specific password |
| `RILOG_SMTP_FROM` | Sender address shown in the email |
| `RILOG_SMTP_TO` | Recipient address for alerts |

**Gmail example** — create an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA):
```env
RILOG_SMTP_HOST=smtp.gmail.com
RILOG_SMTP_PORT=587
RILOG_SMTP_SECURE=false
RILOG_SMTP_USER=you@gmail.com
RILOG_SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # App Password, not your main password
RILOG_SMTP_FROM=you@gmail.com
RILOG_SMTP_TO=admin@your-company.com
RILOG_ON_EXCEEDED=cleanup+email
```

### Cleanup behaviour

When `cleanup` is active, files are deleted **oldest first** (by modification time) until total storage drops below **80%** of the threshold. This prevents constant re-triggering. A summary is printed to stdout after each cleanup run.

> **Note:** cleanup removes entire log files, not individual entries. The newest files for each app are always preserved until they are older than others.

---

## Connecting rilog-lib

### Installation

```bash
npm install @rilog-development/rilog-lib
```

### Minimal setup

```ts
import rilog from '@rilog-development/rilog-lib';

rilog.init({
  config: {
    localServer: {
      appName: 'my-app',
    },
  },
});
```

This sends all captured events to `http://localhost:3030/api/events/save`. The `appName` becomes the log folder name (slugified to lowercase with dashes).

### Full `localServer` options

```ts
rilog.init({
  config: {
    localServer: {
      appName: 'my-app',   // required — determines logs/my-app/ folder

      params: {            // optional key-value pairs saved with every batch
        environment: 'production',
        version: '1.2.0',
      },
    },
  },
});
```

| Option | Required | Description |
|--------|----------|-------------|
| `appName` | Yes | Identifies the app. Saved as `logs/<slug>/`. |
| `params` | No | Arbitrary metadata attached to every log entry. |
| `url` | No | Override the server URL (default: `http://localhost:3030`). |

### Custom server URL

```ts
rilog.init({
  config: {
    localServer: {
      appName: 'my-app',
      url: 'https://rilog.your-domain.com',
    },
  },
});
```

### Framework examples

**React (Vite / CRA)**

```ts
// src/rilog.ts
import rilog from '@rilog-development/rilog-lib';

rilog.init({
  config: {
    localServer: {
      appName: 'my-react-app',
      params: { env: import.meta.env.MODE },
    },
  },
});

export default rilog;
```

```ts
// src/main.tsx
import './rilog';   // ← initialize before anything else
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
```

**Next.js (App Router)**

```ts
// app/providers.tsx
'use client';
import { useEffect } from 'react';
import rilog from '@rilog-development/rilog-lib';

export function RilogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    rilog.init({
      config: {
        localServer: {
          appName: 'my-next-app',
          url: process.env.NEXT_PUBLIC_RILOG_URL,
        },
      },
    });
  }, []);
  return <>{children}</>;
}
```

**Vue 3**

```ts
// src/plugins/rilog.ts
import type { App } from 'vue';
import rilog from '@rilog-development/rilog-lib';

export function installRilog(app: App) {
  rilog.init({
    config: {
      localServer: {
        appName: 'my-vue-app',
        params: { env: import.meta.env.MODE },
      },
    },
  });
  app.config.globalProperties.$rilog = rilog;
}
```

**Angular**

```ts
// src/app/app.module.ts
import { APP_INITIALIZER, NgModule } from '@angular/core';
import rilog from '@rilog-development/rilog-lib';

function initRilog() {
  return () => rilog.init({
    config: {
      localServer: { appName: 'my-angular-app' },
    },
  });
}

@NgModule({
  providers: [
    { provide: APP_INITIALIZER, useFactory: initRilog, multi: true },
  ],
})
export class AppModule {}
```

---

## Log file formats

### NDJSON (default) — `format: 'ndjson'`

One JSON object per line. Each line is one batch (one POST from the browser).

```jsonl
{"timestamp":"2025-05-15T14:22:01.000Z","uToken":"abc-123","appName":"my-app","events":[...]}
{"timestamp":"2025-05-15T14:22:05.000Z","uToken":"abc-123","appName":"my-app","events":[...]}
```

**Best for:** Streaming, large files, dashboard integration.

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

Standard JSON array. Valid JSON throughout.

```json
[
  { "timestamp": "2025-05-15T14:22:01.000Z", "uToken": "abc-123", "events": [...] },
  { "timestamp": "2025-05-15T14:22:05.000Z", "uToken": "abc-123", "events": [...] }
]
```

**Best for:** Quick inspection, compatibility with tools that expect JSON files.

---

### Plain text — `format: 'txt'`

Human-readable blocks, one per batch.

```
─────────────────────────────────────────
[2025-05-15T14:22:01.000Z] SESSION: abc-123  APP: my-app
EVENTS (3):
  [0] REQUEST  GET https://api.example.com/users  200  45ms
  [1] CLICK  BUTTON#submit .btn "Sign In"
  [2] CONSOLE_ERROR  TypeError: Cannot read properties of undefined
─────────────────────────────────────────
```

**Best for:** Terminal tailing, sharing snippets.

```bash
tail -f logs/my-app/2025-05-15.log.txt
```

---

## File layout

```
logs/
  my-frontend-app/               ← one folder per app (name is slugified)
    2025-05-14.log.ndjson        ← yesterday
    2025-05-15.log.ndjson        ← today part 1 (up to maxFileSizeMB)
    2025-05-15_part2.log.ndjson  ← today part 2 (created when part 1 is full)
  admin-panel/
    2025-05-15.log.ndjson
```

---

## API endpoints

### `POST /api/events/save`

The endpoint rilog-lib calls. Accepts `application/json` (normal requests) and `text/plain` / `application/octet-stream` (sendBeacon on page unload). Always public — no auth required.

```bash
curl -X POST http://localhost:3030/api/events/save \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "test-app",
    "uToken": "session-001",
    "events": "[{\"_id\":\"e1\",\"type\":1,\"date\":\"1747314121000\",\"location\":{\"origin\":\"http://localhost:3000\",\"href\":\"http://localhost:3000\"},\"data\":{\"id\":\"btn\",\"inner\":\"Click me\",\"nodeName\":\"BUTTON\",\"classNames\":\"btn\"}}]"
  }'
```

Response:
```json
{ "result": "SUCCESS", "file": "logs/test-app/2025-05-15.log.ndjson" }
```

---

### `GET /api/apps`

Returns all apps and their available log dates. Protected by auth middleware when auth is enabled.

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

### `GET /api/auth/status`

Returns whether auth is enabled. Used by the dashboard to decide whether to show a login screen.

```json
{ "enabled": true }
```

---

### `POST /api/auth/login`

```bash
curl -X POST http://localhost:3030/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "password": "your-password" }'
```

```json
{ "result": "SUCCESS", "token": "<bearer-token>" }
```

The token is an in-memory session token (resets on server restart). Pass it as `Authorization: Bearer <token>` to protected endpoints.

---

## Event types

| Type | # | What it records |
|------|---|----------------|
| REQUEST | 0 | HTTP requests + responses (URL, method, status, duration, body) |
| CLICK | 1 | DOM click events (element tag, id, classes, text) |
| INPUT | 2 | Form input blur events (field name, type, value) |
| CONSOLE_ERROR | 3 | `console.error`, uncaught exceptions, unhandled rejections (with stack trace) |
| DEBUG_MESSAGE | 4 | Manual `rilog.logData(label, data)` calls |
| CONSOLE_WARN | 5 | `console.warn` calls |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Dev mode — nodemon + ts-node, restarts on file changes |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run dev` | Build + run compiled output |
| `npm run test` | Run Jest tests |
| `npm run dashboard:install` | Install dashboard dependencies |
| `npm run dashboard:dev` | Start dashboard dev server |
| `npm run dashboard:build` | Build dashboard for production |

---

## Dependencies

| Package | Role |
|---------|------|
| `express` | HTTP server |
| `cors` | CORS headers |
| `async-mutex` | Prevents race conditions on concurrent writes to the same app |
| `nodemailer` | Sends email alerts when storage threshold is exceeded (optional — only used if SMTP is configured) |

No database. No cloud services required. SMTP is the only optional external dependency, and only when `RILOG_ON_EXCEEDED` includes `email`.

---

## Troubleshooting

**Port already in use:**
```
[rilog-local] Error: port 3030 is already in use
```
Change `RILOG_PORT` or kill the process holding that port.

**CORS error in browser console:**
Add your frontend's origin to `RILOG_CORS_ORIGINS` (comma-separated) or to `cors.origins` in the config file, then restart.

**No events arriving:**
- Confirm rilog-lib is configured with `localServer` mode and the correct `url`.
- Check the server is running: `curl http://localhost:3030/api/auth/status`
- Check server stdout for incoming request logs.

**Dashboard shows "Unauthorized":**
Set `RILOG_AUTH_ENABLED=true` and `RILOG_AUTH_PASSWORD` in your environment, then restart.

**Logs not visible in `/api/apps`:**
The endpoint scans `RILOG_LOGS_DIR` for directories. Ensure at least one event has been written and the configured path matches where files are actually stored.

**In Docker — where are my log files?**
Logs are written to `./logs/` on the host machine (the directory next to `docker-compose.yml`). They survive container restarts and rebuilds automatically. See [Where log files are stored](#where-log-files-are-stored).

**Storage alert email is not being sent:**
Check that all `RILOG_SMTP_*` variables are set and `RILOG_ON_EXCEEDED` contains `email`. The server logs `[rilog-email]` messages on every attempt — check `docker compose logs` or `pm2 logs` for errors from the SMTP connection.
