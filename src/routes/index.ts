import { Application } from 'express';
import eventsRoutes from './events.routes';
import appsRoutes from './apps.routes';

export default class Routes {
  constructor(app: Application) {
    app.use('/api', eventsRoutes);
    app.use('/api', appsRoutes);
  }
}
