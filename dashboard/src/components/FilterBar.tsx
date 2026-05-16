import { useStore } from '../store/useStore';
import { ERilogEvent } from '../types/rilog';

const inputCls = 'px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition';

export function FilterBar() {
  const { filters, setFilter, resetFilters, t } = useStore();

  const hasActiveFilters =
    filters.search !== '' ||
    filters.urlPattern !== '' ||
    filters.labelFilter !== '' ||
    filters.statusFilter !== 'all';

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

      {hasActiveFilters && (
        <button onClick={resetFilters} className="text-xs text-brand-teal hover:underline">
          {t.clearFilters}
        </button>
      )}
    </div>
  );
}

export function applyFilters(
  events: import('../types/rilog').FlatEvent[],
  filters: import('../store/useStore').Filters,
): import('../types/rilog').FlatEvent[] {
  return events.filter((fe) => {
    const ev = fe.event;

    if (filters.eventTypes.size > 0 && !filters.eventTypes.has(ev.type)) return false;
    if (filters.sessionToken && fe.uToken !== filters.sessionToken) return false;

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

    return true;
  });
}
