import express, { Application } from 'express';
import Server from './src/index';
import { config } from './src/config';
import { storageMonitor } from './src/services/storageMonitor';

const app: Application = express();
new Server(app);

const host = process.env.RILOG_HOST ?? '0.0.0.0';

app
  .listen(config.port, host, () => {
    console.log(`[rilog-local] Server is running on http://${host}:${config.port}`);
    storageMonitor.start();
  })
  .on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[rilog-local] Error: port ${config.port} is already in use`);
    } else {
      console.error(err);
    }
  });
