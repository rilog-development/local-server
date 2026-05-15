import express, { Application } from 'express';
import Server from './src/index';
import { config } from './src/config';

const app: Application = express();
new Server(app);

app
  .listen(config.port, 'localhost', () => {
    console.log(`[rilog-local] Server is running on http://localhost:${config.port}`);
  })
  .on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[rilog-local] Error: port ${config.port} is already in use`);
    } else {
      console.error(err);
    }
  });
