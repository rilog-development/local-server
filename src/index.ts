import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import Routes from './routes';
import { config } from './config';

export default class Server {
  constructor(app: Application) {
    this.config(app);
    new Routes(app);
  }

  private config(app: Application): void {
    const corsOptions: CorsOptions = {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    };

    app.use(cors(corsOptions));
    // JSON for normal fetch/XHR requests
    app.use(express.json({ limit: '10mb' }));
    // text/plain for sendBeacon with a text Blob
    app.use(express.text({ type: 'text/plain', limit: '10mb' }));
    // application/octet-stream for sendBeacon with a binary Blob
    app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
  }
}
