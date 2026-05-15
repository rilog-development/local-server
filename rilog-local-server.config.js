/** @type {import('./src/config').RilogConfig} */
module.exports = {
  port: 3030,
  logsDir: './logs',
  format: 'ndjson',
  maxFileSizeMB: 10,
  timezone: 'UTC',
  cors: {
    origins: ['http://localhost:3000'],
  },
};
