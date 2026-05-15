import { Router } from 'express';
import EventsController from '../controllers/events.controller';

const router = Router();
const controller = new EventsController();

router.post('/events/save', controller.saveEvents.bind(controller));

export default router;
