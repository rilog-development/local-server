import { Router } from 'express';
import AuthController from '../controllers/auth.controller';

const router = Router();
const controller = new AuthController();

router.get('/auth/status', controller.getStatus.bind(controller));
router.post('/auth/login', controller.login.bind(controller));
router.post('/auth/logout', controller.logout.bind(controller));

export default router;
