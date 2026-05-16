import { IRilogEventItem, TDeviceInfo } from './rilog';

export interface LogEntry {
  timestamp: string;
  uToken: string;
  appName: string;
  params?: Record<string, string>;
  deviceInfo?: TDeviceInfo;
  events: IRilogEventItem[];
}

export interface SaveEventsRequest {
  appName: string;
  params?: Record<string, string>;
  deviceInfo?: TDeviceInfo;
  uToken: string;
  events: IRilogEventItem[];
}
