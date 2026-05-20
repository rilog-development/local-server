import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useStore } from '../store/useStore';
import { Sidebar } from '../components/Sidebar';
import { StatsBar, SessionBar } from '../components/StatsBar';
import { FilterBar } from '../components/FilterBar';
import { EventList } from '../components/EventList';
import { EventDetail } from '../components/EventDetail';
import { DeleteModal } from '../components/DeleteModal';
import { flattenEntries, buildSessions } from '../utils/eventHelpers';

export function Dashboard() {
  const { selectedApp, selectedDate, t } = useStore();
  const [showDelete, setShowDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['logs', selectedApp, selectedDate],
    queryFn: () => api.getLogs(selectedApp!, selectedDate!),
    enabled: Boolean(selectedApp && selectedDate),
    staleTime: 30_000,
  });

  const flatEvents = useMemo(
    () => (data?.entries ? flattenEntries(data.entries) : []),
    [data?.entries],
  );

  const sessions = useMemo(
    () => (data?.entries ? buildSessions(data.entries) : []),
    [data?.entries],
  );

  const meta = data?.meta ?? { totalBatches: 0, totalEvents: 0, parts: 0, sizeBytes: 0 };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedApp || !selectedDate ? (
          <EmptyState />
        ) : (
          <>
            <StatsBar events={flatEvents} sessions={sessions} meta={meta} onDeleteClick={() => setShowDelete(true)} onRefresh={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['apps'] }); }} />
            <SessionBar sessions={sessions} />
            <FilterBar />

            <div className="flex-1 flex overflow-hidden">
              {isLoading && <LoadingState />}
              {error && <ErrorState message={(error as Error).message} />}
              {!isLoading && !error && <EventList events={flatEvents} />}
            </div>
          </>
        )}
      </div>

      <EventDetail />

      {showDelete && selectedApp && selectedDate && (
        <DeleteModal appName={selectedApp} date={selectedDate} onClose={() => setShowDelete(false)} />
      )}
    </div>
  );

  function EmptyState() {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-brand-lightest dark:bg-brand-dark/40 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">{t.selectDate}</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.pickDate}</p>
      </div>
    );
  }
}

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
      <p className="text-sm text-red-500">{message}</p>
    </div>
  );
}
