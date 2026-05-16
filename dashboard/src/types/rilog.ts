export enum ERilogEvent {
  REQUEST = 0,
  CLICK = 1,
  INPUT = 2,
  CONSOLE_ERROR = 3,
  DEBUG_MESSAGE = 4,
  CONSOLE_WARN = 5,
}

export interface IRilogLocation {
  origin: string | null;
  href: string | null;
}

export interface IRilogEventItem {
  _id: string;
  type: ERilogEvent;
  date: string;
  data: unknown;
  location: IRilogLocation;
}

export interface IRilogRequestItem {
  _id: string;
  request: {
    url: string;
    method: string;
    headers: unknown;
    data?: unknown;
    location: { origin: string | null; href: string | null };
    localStorage: string | null;
    timestamp: number;
  };
  response: {
    data?: unknown;
    url: string;
    status?: string | null;
    timestamp: number;
  };
  duration?: string | null;
}

export interface IRilogClick {
  id: string;
  inner: string;
  nodeName: string;
  classNames: string;
}

export interface IRilogInput {
  type: number;
  value: string;
  nodeName: string;
  className: string;
  id: string;
  name: string;
  inputType: string;
}

export interface IRilogConsoleData {
  level: 'warn' | 'error';
  message: string;
  stackTrace?: string;
  source: 'console' | 'runtime' | 'unhandledRejection';
  errorFile?: string;
  errorLine?: number;
  errorColumn?: number;
}

export interface IRilogMessageData {
  data: string;
  label: string;
  shouldBeParsed: boolean;
  stackTrace?: string;
}

export type TDeviceInfo = {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  language: string;
  hardwareConcurrency: number | null;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string | null;
};

export interface LogEntry {
  timestamp: string;
  uToken: string;
  appName: string;
  params?: Record<string, string>;
  deviceInfo?: TDeviceInfo;
  events: IRilogEventItem[];
}

export interface FlatEvent {
  batchTimestamp: string;
  uToken: string;
  appName: string;
  params?: Record<string, string>;
  deviceInfo?: TDeviceInfo;
  event: IRilogEventItem;
  batchIndex: number;
  eventIndex: number;
  uniqueKey: string;
}

export interface SessionInfo {
  uToken: string;
  deviceInfo?: TDeviceInfo;
  firstSeen: string;
  lastSeen: string;
  totalEvents: number;
  eventCounts: Record<number, number>;
}
