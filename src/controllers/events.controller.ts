import { Request, Response, response } from "express";
import EventsService, { IEventsServis } from "../services/events.service";
import { FileFormats } from "../types/events";
import { IRilogResponse } from "../types/rilog";

export interface IEventsController {
    saveEvents: (req: Request, res: Response) => Promise<Response>;
}
class EventsController implements IEventsController {
    public eventsService: IEventsServis;

    constructor() {
        this.eventsService = new EventsService();
    }

    async saveEvents(req: Request, res: Response) {
        if (!req.body.events || !req.body.uToken) {
            res.status(400).send({ error: "appName, uToken or events not found."})
        }

        const decodedEvents = this.eventsService.decodeData(req.body.events);

        if (!decodedEvents || !Array.isArray(decodedEvents)) {
            res.status(400).send({ error: "events is not array."})
        }

        const result = await this.eventsService?.saveEvents({
            uToken: req.body.uToken || "unknown",
            appName: req.body.appName || "Unknown app",
            fileFormat: req.body.fileFormat || FileFormats.TXT,
            events: decodedEvents || [],
         });
        
        return res.json({ result: result ? "success" : "error" });
    }
}

export default EventsController;