import { Router } from 'express';
import LogsController from '../controllers/logs.controller';

const router = Router();
const controller = new LogsController();

router.get('/logs/:appName/:date/download', controller.downloadLogs.bind(controller));
router.get('/logs/:appName/:date', controller.getLogs.bind(controller));
router.delete('/logs/:appName/:date', controller.deleteLogs.bind(controller));

export default router;
