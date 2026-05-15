import { Router } from 'express';
import AppsController from '../controllers/apps.controller';

const router = Router();
const controller = new AppsController();

router.get('/apps', controller.getApps.bind(controller));

export default router;
