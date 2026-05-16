import { SaveEventsRequest, LogEntry } from '../types/events';
import { IFileWriter } from '../writers/IFileWriter';
import { NdjsonWriter } from '../writers/NdjsonWriter';
import { JsonWriter } from '../writers/JsonWriter';
import { TxtWriter } from '../writers/TxtWriter';
import { fileRotator } from './fileRotator';
import { config } from '../config';

export interface IEventsService {
  saveEvents(data: SaveEventsRequest): Promise<string | null>;
  decodeData(data: string): unknown;
}

const writers: Record<string, IFileWriter> = {
  ndjson: new NdjsonWriter(),
  json: new JsonWriter(),
  txt: new TxtWriter(),
};

class EventsService implements IEventsService {
  private writer: IFileWriter;

  constructor() {
    this.writer = writers[config.format] ?? writers.ndjson;
  }

  async saveEvents(data: SaveEventsRequest): Promise<string | null> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      uToken: data.uToken,
      appName: data.appName,
      params: data.params,
      deviceInfo: data.deviceInfo,
      events: data.events,
    };

    try {
      return await fileRotator.write(data.appName, entry, this.writer);
    } catch (err) {
      console.error('[rilog-local] write error:', err);
      return null;
    }
  }

  decodeData(data: string): unknown {
    return JSON.parse(data);
  }
}

export default EventsService;
