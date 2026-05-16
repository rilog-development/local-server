import { ERilogEvent, FlatEvent, IRilogRequestItem } from '../types/rilog';
import { Badge } from './Badge';
import { EVENT_COLORS, formatEventDate, getStatusColor } from '../utils/eventHelpers';

interface EventRowProps {
  fe: FlatEvent;
  isSelected: boolean;
  onClick: () => void;
}

export function EventRow({ fe, isSelected, onClick }: EventRowProps) {
  const { event } = fe;
  const colors = EVENT_COLORS[event.type] ?? { dot: 'bg-gray-400' };

  const isError =
    event.type === ERilogEvent.CONSOLE_ERROR ||
    (event.type === ERilogEvent.REQUEST && (() => {
      const d = event.data as IRilogRequestItem;
      const s = d?.response?.status;
      return s && (parseInt(s) >= 400 || s === 'network_error' || s === 'timeout');
    })());

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 h-10 cursor-pointer border-b transition-colors select-none ${
        isSelected
          ? 'bg-brand-lightest dark:bg-brand-dark/60 border-l-2 border-l-brand-teal border-b-gray-100 dark:border-b-gray-700'
          : isError
          ? 'hover:bg-red-50/50 dark:hover:bg-red-900/10 border-l-2 border-l-red-300 dark:border-l-red-700 border-b-gray-50 dark:border-b-gray-700/50'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border-l-2 border-l-transparent border-b-gray-50 dark:border-b-gray-700/50'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />

      <div className="w-24 flex-shrink-0">
        <Badge type={event.type} small />
      </div>

      {/* Date */}
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0 w-36">
        {formatEventDate(fe.batchTimestamp)}
      </span>

      {/* Summary */}
      <p className={`flex-1 text-xs truncate ${isError ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
        {event.type === ERilogEvent.REQUEST
          ? <RequestSummary data={event.data} />
          : <TextSummary fe={fe} />}
      </p>

      {/* Session token */}
      <span className="text-xs text-gray-300 dark:text-gray-600 font-mono w-14 truncate flex-shrink-0 hidden xl:block">
        {fe.uToken.slice(0, 6)}
      </span>
    </div>
  );
}

function RequestSummary({ data }: { data: unknown }) {
  const d = data as IRilogRequestItem;
  const method = d?.request?.method ?? '';
  const url = d?.request?.url ?? '';
  const status = d?.response?.status;
  const duration = d?.duration;

  const urlShort = (() => {
    try {
      const u = new URL(url);
      return u.pathname + (u.search || '');
    } catch { return url; }
  })();

  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-gray-400 dark:text-gray-500 w-9 flex-shrink-0">{method}</span>
      <span className="truncate">{urlShort}</span>
      {status && (
        <span className={`font-mono flex-shrink-0 ${getStatusColor(status)}`}>{status}</span>
      )}
      {duration && (
        <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">{duration}</span>
      )}
    </span>
  );
}

function TextSummary({ fe }: { fe: FlatEvent }) {
  const { event } = fe;
  switch (event.type) {
    case ERilogEvent.CLICK: {
      const d = event.data as { nodeName?: string; inner?: string };
      return <>{d?.nodeName}: &ldquo;{d?.inner}&rdquo;</>;
    }
    case ERilogEvent.CONSOLE_ERROR:
    case ERilogEvent.CONSOLE_WARN: {
      const d = event.data as { message?: string };
      return <>{d?.message}</>;
    }
    case ERilogEvent.DEBUG_MESSAGE: {
      const d = event.data as { label?: string; data?: string };
      return <><span className="text-amber-600 dark:text-amber-400 font-mono">[{d?.label}]</span> {d?.data}</>;
    }
    case ERilogEvent.INPUT: {
      const d = event.data as { name?: string; inputType?: string; value?: string };
      return <>{d?.name || d?.inputType}: &ldquo;{d?.value}&rdquo;</>;
    }
    default:
      return <>{JSON.stringify(event.data).slice(0, 80)}</>;
  }
}
