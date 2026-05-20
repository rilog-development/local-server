import { useState } from 'react';
import { ERilogEvent, FlatEvent, SessionInfo } from '../types/rilog';
import { Badge } from './Badge';
import { useStore } from '../store/useStore';
import { formatEventDate } from '../utils/eventHelpers';
import { api } from '../api';

interface StatsBarProps {
  events: FlatEvent[];
  sessions: SessionInfo[];
  meta: { totalBatches: number; totalEvents: number; parts: number; sizeBytes: number };
  onDeleteClick: () => void;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const TYPE_ORDER = [
  ERilogEvent.REQUEST,
  ERilogEvent.CONSOLE_ERROR,
  ERilogEvent.CONSOLE_WARN,
  ERilogEvent.CLICK,
  ERilogEvent.DEBUG_MESSAGE,
  ERilogEvent.INPUT,
];

export function StatsBar({ events, sessions, meta, onDeleteClick, onRefresh }: StatsBarProps) {
  const { filters, toggleEventType, resetFilters, selectedDate, selectedApp, t } = useStore();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!selectedApp || !selectedDate) return;
    setDownloading(true);
    try {
      await api.downloadLogs(selectedApp, selectedDate);
    } finally {
      setDownloading(false);
    }
  }

  const countByType: Record<number, number> = {};
  for (const fe of events) {
    countByType[fe.event.type] = (countByType[fe.event.type] ?? 0) + 1;
  }

  const errorCount = (countByType[ERilogEvent.CONSOLE_ERROR] ?? 0) +
    events.filter((fe) => {
      if (fe.event.type !== ERilogEvent.REQUEST) return false;
      const d = fe.event.data as { response?: { status?: string } };
      const s = d?.response?.status;
      return s && (parseInt(s) >= 400 || s === 'network_error' || s === 'timeout');
    }).length;

  const hasTypeFilter = filters.eventTypes.size > 0;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex-shrink-0">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <span>
            <span className="font-semibold text-brand-dark dark:text-brand-lighter">{meta.totalEvents.toLocaleString()}</span>{' '}{t.events}
          </span>
          <span>
            <span className="font-semibold text-brand-dark dark:text-brand-lighter">{sessions.length}</span>{' '}{t.sessions}
          </span>
          <span title={t.batchesHint} className="cursor-help border-b border-dotted border-gray-400 dark:border-gray-500">
            <span className="font-semibold text-brand-dark dark:text-brand-lighter">{meta.totalBatches}</span>{' '}{t.batches}
          </span>
          {meta.parts > 1 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{meta.parts} {t.parts}</span>
          )}
          {meta.sizeBytes > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t.size}: <span className="font-medium text-gray-500 dark:text-gray-300">{formatBytes(meta.sizeBytes)}</span>
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-red-500 font-medium">⚠ {errorCount} {t.errors}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedDate && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{selectedApp} · {selectedDate}</span>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t.refresh}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand-teal hover:text-brand-teal/80 hover:bg-brand-lightest dark:hover:bg-brand-dark/30 rounded-lg border border-brand-teal/30 dark:border-brand-teal/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? t.downloading : t.downloadDay}
          </button>
          <button
            onClick={onDeleteClick}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.deleteDay}
          </button>
        </div>
      </div>

      {/* Type filter badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-gray-500">{t.filterBy}</span>
        {TYPE_ORDER.map((type) => {
          const count = countByType[type] ?? 0;
          if (count === 0) return null;
          const isActive = hasTypeFilter ? filters.eventTypes.has(type) : true;
          return (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={`flex items-center gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}
            >
              <Badge type={type} small />
              <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
            </button>
          );
        })}
        {hasTypeFilter && (
          <button onClick={resetFilters} className="text-xs text-brand-teal hover:underline ml-1">
            {t.reset}
          </button>
        )}
      </div>
    </div>
  );
}

export function SessionBar({ sessions }: { sessions: SessionInfo[] }) {
  const { filters, setFilter, t } = useStore();
  if (!sessions.length) return null;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{t.session}</span>
      <button
        onClick={() => setFilter('sessionToken', '')}
        className={`text-xs px-2 py-0.5 rounded-full border transition ${
          !filters.sessionToken
            ? 'bg-brand-dark text-white border-brand-dark'
            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-dark'
        }`}
      >
        {t.allSessions}
      </button>
      {sessions.map((s) => (
        <button
          key={s.uToken}
          onClick={() => setFilter('sessionToken', s.uToken)}
          title={`${formatEventDate(s.firstSeen)} — ${s.totalEvents} ${t.events}${s.deviceInfo ? ' · ' + s.deviceInfo.deviceType : ''}`}
          className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap transition ${
            filters.sessionToken === s.uToken
              ? 'bg-brand-dark text-white border-brand-dark'
              : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-dark'
          }`}
        >
          {s.uToken.slice(0, 8)}…
          {s.deviceInfo && <span className="ml-1 opacity-60">{s.deviceInfo.deviceType[0].toUpperCase()}</span>}
        </button>
      ))}
    </div>
  );
}
