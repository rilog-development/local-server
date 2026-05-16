import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../store/useStore';
import { FlatEvent } from '../types/rilog';
import { EventRow } from './EventRow';
import { applyFilters } from './FilterBar';

const ROW_HEIGHT = 40;

interface EventListProps {
  events: FlatEvent[];
}

export function EventList({ events }: EventListProps) {
  const { filters, selectedEvent, setSelectedEvent, t } = useStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (!filtered.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        {events.length === 0 ? t.noEvents : t.noMatch}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto bg-white dark:bg-gray-900">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const fe = filtered[vItem.index];
          return (
            <div
              key={vItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: ROW_HEIGHT,
                transform: `translateY(${vItem.start}px)`,
              }}
            >
              <EventRow
                fe={fe}
                isSelected={selectedEvent?.uniqueKey === fe.uniqueKey}
                onClick={() => setSelectedEvent(selectedEvent?.uniqueKey === fe.uniqueKey ? null : fe)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
