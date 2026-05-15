import { Request, Response } from 'express';
import appsService from '../services/appsService';

class AppsController {
  async getApps(_req: Request, res: Response): Promise<void> {
    const data = await appsService.getApps();
    res.json(data);
  }
}

export default AppsController;
