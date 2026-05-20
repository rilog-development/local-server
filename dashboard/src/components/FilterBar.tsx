import { useStore } from '../store/useStore';
import { ERilogEvent, FlatEvent } from '../types/rilog';

const inputCls = 'px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition';

export function FilterBar() {
  const { filters, setFilter, resetFilters, t } = useStore();

  const hasActiveFilters =
    filters.search !== '' ||
    filters.urlPattern !== '' ||
    filters.labelFilter !== '' ||
    filters.statusFilter !== 'all' ||
    filters.dedupe;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex items-center gap-3 flex-wrap flex-shrink-0">
      {/* Search */}
      <div className="relative">
        <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={t.search}
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className={`pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 w-52 transition`}
        />
      </div>

      <input
        type="text"
        placeholder={t.urlPattern}
        value={filters.urlPattern}
        onChange={(e) => setFilter('urlPattern', e.target.value)}
        className={`${inputCls} w-40`}
      />

      <select
        value={filters.statusFilter}
        onChange={(e) => setFilter('statusFilter', e.target.value as typeof filters.statusFilter)}
        className={`${inputCls} cursor-pointer`}
      >
        <option value="all">{t.statusAll}</option>
        <option value="2xx">{t.status2xx}</option>
        <option value="3xx">{t.status3xx}</option>
        <option value="4xx">{t.status4xx}</option>
        <option value="5xx">{t.status5xx}</option>
        <option value="error">{t.statusError}</option>
      </select>

      <input
        type="text"
        placeholder={t.label}
        value={filters.labelFilter}
        onChange={(e) => setFilter('labelFilter', e.target.value)}
        className={`${inputCls} w-32`}
      />

      <button
        onClick={() => setFilter('dedupe', !filters.dedupe)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
          filters.dedupe
            ? 'bg-brand-teal/10 border-brand-teal text-brand-teal dark:bg-brand-teal/20'
            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-teal hover:text-brand-teal'
        }`}
        title={t.dedupeHint}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {t.dedupe}
      </button>

      {hasActiveFilters && (
        <button onClick={resetFilters} className="text-xs text-brand-teal hover:underline">
          {t.clearFilters}
        </button>
      )}
    </div>
  );
}

function getDedupeKey(fe: FlatEvent): string {
  const { event } = fe;
  switch (event.type) {
    case ERilogEvent.CONSOLE_ERROR:
    case ERilogEvent.CONSOLE_WARN: {
      const d = event.data as { message?: string; source?: string };
      return `${event.type}:${d?.source ?? ''}:${d?.message ?? ''}`;
    }
    case ERilogEvent.REQUEST: {
      const d = event.data as { request?: { url?: string; method?: string }; response?: { status?: string } };
      return `${event.type}:${d?.request?.method ?? ''}:${d?.request?.url ?? ''}:${d?.response?.status ?? ''}`;
    }
    case ERilogEvent.DEBUG_MESSAGE: {
      const d = event.data as { label?: string; data?: unknown };
      return `${event.type}:${d?.label ?? ''}:${JSON.stringify(d?.data)}`;
    }
    default:
      return `${event.type}:${JSON.stringify(event.data)}`;
  }
}

export function applyFilters(
  events: import('../types/rilog').FlatEvent[],
  filters: import('../store/useStore').Filters,
): import('../types/rilog').FlatEvent[] {
  const seen = new Set<string>();

  return events.filter((fe) => {
    const ev = fe.event;

    if (filters.eventTypes.size > 0 && !filters.eventTypes.has(ev.type)) return false;
    if (filters.sessionToken && fe.uToken !== filters.sessionToken) return false;

    if ((filters.statusFilter !== 'all' || filters.urlPattern) && ev.type !== ERilogEvent.REQUEST) return false;

    if (ev.type === ERilogEvent.REQUEST) {
      const d = ev.data as { request?: { url?: string }; response?: { status?: string } };
      if (filters.urlPattern && !d?.request?.url?.toLowerCase().includes(filters.urlPattern.toLowerCase())) {
        return false;
      }
      if (filters.statusFilter !== 'all') {
        const status = d?.response?.status ?? '';
        if (filters.statusFilter === 'error') {
          if (status !== 'network_error' && status !== 'timeout') return false;
        } else {
          const code = parseInt(status, 10);
          const prefix = filters.statusFilter[0];
          if (isNaN(code) || !String(code).startsWith(prefix)) return false;
        }
      }
    }

    if (filters.labelFilter && ev.type === ERilogEvent.DEBUG_MESSAGE) {
      const d = ev.data as { label?: string };
      if (!d?.label?.toLowerCase().includes(filters.labelFilter.toLowerCase())) return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const json = JSON.stringify(ev.data).toLowerCase();
      if (!json.includes(q) && !fe.uToken.toLowerCase().includes(q)) return false;
    }

    if (filters.dedupe) {
      const key = getDedupeKey(fe);
      if (seen.has(key)) return false;
      seen.add(key);
    }

    return true;
  });
}
