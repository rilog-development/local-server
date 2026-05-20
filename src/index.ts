import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';
import fs from 'fs';
import Routes from './routes';
import { config } from './config';

export default class Server {
  constructor(app: Application) {
    this.config(app);
    new Routes(app);
    this.serveDashboard(app);
  }

  private config(app: Application): void {
    const allowAll = config.cors.origins.includes('*');
    const corsOptions: CorsOptions = {
      origin: allowAll ? '*' : config.cors.origins,
      methods: ['GET', 'POST', 'DELETE'],
    };

    app.use(cors(corsOptions));
    const sizeLimit = `${config.maxRequestSizeMB}mb`;
    // JSON for normal fetch/XHR requests
    app.use(express.json({ limit: sizeLimit }));
    // text/plain for sendBeacon with a text Blob
    app.use(express.text({ type: 'text/plain', limit: sizeLimit }));
    // application/octet-stream for sendBeacon with a binary Blob
    app.use(express.raw({ type: 'application/octet-stream', limit: sizeLimit }));
    app.use(express.urlencoded({ extended: true }));
  }

  private serveDashboard(app: Application): void {
    const distPath = path.resolve(process.cwd(), 'dashboard/dist');
    if (!fs.existsSync(distPath)) return;

    app.use(express.static(distPath));
    // SPA fallback — all non-API routes serve index.html
    app.get(/^(?!\/api).*$/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}
