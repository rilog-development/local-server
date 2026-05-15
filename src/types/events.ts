import { IRilogEventItem } from './rilog';

export interface LogEntry {
  timestamp: string;
  uToken: string;
  appName: string;
  params?: Record<string, string>;
  events: IRilogEventItem[];
}

export interface SaveEventsRequest {
  appName: string;
  params?: Record<string, string>;
  uToken: string;
  events: IRilogEventItem[];
}
