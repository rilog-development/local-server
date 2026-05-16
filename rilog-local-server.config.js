/** @type {import('./src/config').RilogConfig} */
module.exports = {
  port: 3030,
  logsDir: './logs',
  format: 'ndjson',          // 'ndjson' | 'json' | 'txt'
  maxFileSizeMB: 10,
  timezone: 'UTC',           // IANA name, e.g. 'Europe/Kyiv', 'America/New_York'
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  },
  auth: {
    enabled: true,          // set true to require a password for the dashboard
    password: '',           // or set RILOG_AUTH_PASSWORD env var (takes priority)
  },
};
