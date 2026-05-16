import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { authService } from '../services/authService';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.auth.enabled || !config.auth.password) {
    next();
    return;
  }

  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token || !authService.isValidToken(token)) {
    res.status(401).json({ result: 'ERROR', message: 'Unauthorized' });
    return;
  }

  next();
}
