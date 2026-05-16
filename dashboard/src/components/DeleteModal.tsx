import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useStore } from '../store/useStore';

interface DeleteModalProps {
  appName: string;
  date: string;
  onClose: () => void;
}

export function DeleteModal({ appName, date, onClose }: DeleteModalProps) {
  const { setSelectedDate, t } = useStore();
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.deleteLogs(appName, date),
    onSuccess: (res) => {
      if (res.result === 'SUCCESS') {
        queryClient.invalidateQueries({ queryKey: ['apps'] });
        queryClient.removeQueries({ queryKey: ['logs', appName, date] });
        setDone(true);
      }
    },
  });

  if (done) {
    return (
      <Modal>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t.deleteSuccess}</p>
          <button
            onClick={() => { setSelectedDate(''); onClose(); }}
            className="px-4 py-2 bg-brand-dark text-white text-sm rounded-lg hover:bg-opacity-90 transition"
          >
            {t.close}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal>
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.deleteTitle}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.deleteConfirm(appName, date)}</p>
        </div>

        {error && <p className="text-sm text-red-500">{t.deleteError}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {isPending ? t.deleting : t.deleteBtn}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        {children}
      </div>
    </div>
  );
}
