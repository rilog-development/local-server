import { Application, Router } from 'express';
import eventsRoutes from './events.routes';
import appsRoutes from './apps.routes';
import logsRoutes from './logs.routes';
import authRoutes from './auth.routes';
import { authMiddleware } from '../middleware/auth';

export default class Routes {
  constructor(app: Application) {
    // Auth endpoints — no auth middleware (login is public)
    app.use('/api', authRoutes);

    // Browser lib endpoint — always public (no auth required)
    app.use('/api', eventsRoutes);

    // Dashboard endpoints — protected by auth middleware
    const protected_ = Router();
    protected_.use(authMiddleware);
    protected_.use('/', appsRoutes);
    protected_.use('/', logsRoutes);
    app.use('/api', protected_);
  }
}
