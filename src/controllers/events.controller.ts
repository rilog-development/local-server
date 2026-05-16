import { Request, Response } from 'express';
import EventsService, { IEventsService } from '../services/events.service';
import { IRilogEventItem, TDeviceInfo } from '../types/rilog';

export interface IEventsController {
  saveEvents: (req: Request, res: Response) => Promise<void>;
}

class EventsController implements IEventsController {
  private eventsService: IEventsService;

  constructor() {
    this.eventsService = new EventsService();
  }

  async saveEvents(req: Request, res: Response): Promise<void> {
    let body: { events?: string; uToken?: string; appName?: string; params?: Record<string, string>; deviceInfo?: TDeviceInfo };

    try {
      if (Buffer.isBuffer(req.body)) {
        // application/octet-stream via sendBeacon
        body = JSON.parse(req.body.toString('utf-8'));
      } else if (typeof req.body === 'string') {
        // text/plain via sendBeacon
        body = JSON.parse(req.body);
      } else {
        // application/json — already parsed by Express
        body = req.body as typeof body;
      }
    } catch {
      res.json({ result: 'ERROR', message: 'Invalid request body' });
      return;
    }

    if (!body.events || !body.uToken || !body.appName) {
      res.json({ result: 'ERROR', message: 'appName, uToken and events are required' });
      return;
    }

    let events: IRilogEventItem[];
    try {
      events = this.eventsService.decodeData(body.events) as IRilogEventItem[];
    } catch {
      res.json({ result: 'ERROR', message: 'Failed to parse events' });
      return;
    }

    if (!Array.isArray(events)) {
      res.json({ result: 'ERROR', message: 'events must be an array' });
      return;
    }

    const filePath = await this.eventsService.saveEvents({
      uToken: body.uToken,
      appName: body.appName,
      params: body.params,
      deviceInfo: body.deviceInfo,
      events,
    });

    if (filePath === null) {
      res.json({ result: 'ERROR', message: 'Failed to write log file' });
      return;
    }

    console.log(
      `[rilog-local] ${new Date().toISOString()}  app=${body.appName}  events=${events.length}  file=${filePath}`
    );

    res.json({ result: 'SUCCESS', file: filePath });
  }
}

export default EventsController;
