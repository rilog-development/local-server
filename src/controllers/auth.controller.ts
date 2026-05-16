import { Request, Response } from 'express';
import { config } from '../config';
import { authService } from '../services/authService';

class AuthController {
  getStatus(_req: Request, res: Response): void {
    res.json({ enabled: config.auth.enabled && Boolean(config.auth.password) });
  }

  login(req: Request, res: Response): void {
    const { password } = req.body as { password?: string };

    if (!password || !authService.verifyPassword(password)) {
      res.status(401).json({ result: 'ERROR', message: 'Invalid password' });
      return;
    }

    const token = authService.createToken();
    res.json({ result: 'SUCCESS', token });
  }

  logout(req: Request, res: Response): void {
    const header = req.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) authService.revokeToken(token);
    res.json({ result: 'SUCCESS' });
  }
}

export default AuthController;
