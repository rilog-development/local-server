import { Router } from "express";
import EventsController, { IEventsController } from "../controllers/events.controller";

class EventsRoutes {
    public router = Router();
    public eventsController: IEventsController;

    constructor() {
        this.eventsController = new EventsController();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.post("/events/save", this.eventsController?.saveEvents.bind(this.eventsController))
    }
}

export default new EventsRoutes().router;