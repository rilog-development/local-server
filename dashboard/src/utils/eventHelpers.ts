import { ERilogEvent, FlatEvent, IRilogConsoleData, IRilogRequestItem, LogEntry, SessionInfo } from '../types/rilog';

export const EVENT_LABELS: Record<number, string> = {
  [ERilogEvent.REQUEST]: 'REQUEST',
  [ERilogEvent.CLICK]: 'CLICK',
  [ERilogEvent.INPUT]: 'INPUT',
  [ERilogEvent.CONSOLE_ERROR]: 'CONSOLE_ERROR',
  [ERilogEvent.DEBUG_MESSAGE]: 'DEBUG',
  [ERilogEvent.CONSOLE_WARN]: 'CONSOLE_WARN',
};

export const EVENT_COLORS: Record<number, { bg: string; text: string; dot: string }> = {
  [ERilogEvent.REQUEST]:       { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  [ERilogEvent.CLICK]:         { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  [ERilogEvent.INPUT]:         { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  [ERilogEvent.CONSOLE_ERROR]: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  [ERilogEvent.DEBUG_MESSAGE]: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  [ERilogEvent.CONSOLE_WARN]:  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

export function flattenEntries(entries: LogEntry[]): FlatEvent[] {
  const result: FlatEvent[] = [];
  entries.forEach((entry, batchIndex) => {
    entry.events.forEach((event, eventIndex) => {
      result.push({
        batchTimestamp: entry.timestamp,
        uToken: entry.uToken,
        appName: entry.appName,
        params: entry.params,
        deviceInfo: entry.deviceInfo,
        event,
        batchIndex,
        eventIndex,
        uniqueKey: `${batchIndex}-${eventIndex}-${event._id}`,
      });
    });
  });
  return result;
}

export function buildSessions(entries: LogEntry[]): SessionInfo[] {
  const map = new Map<string, SessionInfo>();

  for (const entry of entries) {
    const existing = map.get(entry.uToken);
    const counts: Record<number, number> = existing?.eventCounts ?? {};
    for (const ev of entry.events) {
      counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    }

    if (!existing) {
      map.set(entry.uToken, {
        uToken: entry.uToken,
        deviceInfo: entry.deviceInfo,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        totalEvents: entry.events.length,
        eventCounts: counts,
      });
    } else {
      existing.totalEvents += entry.events.length;
      existing.eventCounts = counts;
      if (entry.timestamp > existing.lastSeen) existing.lastSeen = entry.timestamp;
      if (entry.timestamp < existing.firstSeen) existing.firstSeen = entry.timestamp;
      if (!existing.deviceInfo && entry.deviceInfo) existing.deviceInfo = entry.deviceInfo;
    }
  }

  return [...map.values()].sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
}

export function getRequestSummary(data: unknown): { method: string; url: string; status: string | null } {
  const d = data as IRilogRequestItem;
  return {
    method: d?.request?.method ?? '',
    url: d?.request?.url ?? '',
    status: d?.response?.status ?? null,
  };
}

export function getStatusColor(status: string | null): string {
  if (!status) return 'text-gray-400';
  if (status === 'network_error' || status === 'timeout') return 'text-red-600';
  const code = parseInt(status, 10);
  if (code >= 500) return 'text-red-600';
  if (code >= 400) return 'text-orange-600';
  if (code >= 300) return 'text-yellow-600';
  return 'text-emerald-600';
}

export function getConsoleMessage(data: unknown): string {
  const d = data as IRilogConsoleData;
  return d?.message ?? '';
}

export function getEventSummary(flat: FlatEvent): string {
  const { event } = flat;
  switch (event.type) {
    case ERilogEvent.REQUEST: {
      const { method, url, status } = getRequestSummary(event.data);
      return `${method} ${url}${status ? ' · ' + status : ''}`;
    }
    case ERilogEvent.CLICK: {
      const d = event.data as { nodeName?: string; inner?: string };
      return `${d?.nodeName ?? 'element'}: "${d?.inner ?? ''}"`;
    }
    case ERilogEvent.CONSOLE_ERROR:
    case ERilogEvent.CONSOLE_WARN:
      return getConsoleMessage(event.data);
    case ERilogEvent.DEBUG_MESSAGE: {
      const d = event.data as { label?: string; data?: string };
      return `[${d?.label ?? ''}] ${d?.data ?? ''}`;
    }
    case ERilogEvent.INPUT: {
      const d = event.data as { name?: string; inputType?: string };
      return `${d?.name ?? d?.inputType ?? 'input'}`;
    }
    default:
      return JSON.stringify(event.data).slice(0, 80);
  }
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
}

export function formatRelativeTime(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 1000) return `+${ms}ms`;
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { hour12: false });
}
