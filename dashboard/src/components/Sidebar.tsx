import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useStore } from '../store/useStore';
import logoUrl from '../assets/Logo-base-sm.svg';

export function Sidebar() {
  const { selectedApp, selectedDate, setSelectedApp, setSelectedDate, setToken, lang, setLang, theme, setTheme, t } = useStore();
  const [expandedApp, setExpandedApp] = useState<string | null>(selectedApp);

  const { data, isLoading } = useQuery({
    queryKey: ['apps'],
    queryFn: api.getApps,
    refetchInterval: 10_000,
  });

  async function handleLogout() {
    await api.logout().catch(() => null);
    setToken(null);
  }

  function selectApp(app: string) {
    setExpandedApp(expandedApp === app ? null : app);
    setSelectedApp(app);
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-brand-dark flex flex-col h-full overflow-hidden">
      {/* Logo + controls row */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        {/* Logo — invert to white on dark background */}
        <img src={logoUrl} alt="Rilog" className="h-6 brightness-0 invert" />

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="p-1.5 text-white/40 hover:text-white/80 transition-colors rounded"
          >
            {theme === 'dark' ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'uk' : 'en')}
            className="text-xs px-1.5 py-0.5 text-white/40 hover:text-white/80 transition-colors rounded font-mono"
            title={t.language}
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Apps label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-medium text-white/30 uppercase tracking-wider">{t.apps}</p>
      </div>

      {/* App list */}
      <nav className="flex-1 overflow-y-auto pb-2">
        {isLoading && <p className="px-4 py-3 text-xs text-white/30">…</p>}
        {!isLoading && !data?.apps.length && (
          <p className="px-4 py-3 text-xs text-white/40">{t.noApps}</p>
        )}
        {data?.apps.map((app) => (
          <div key={app}>
            <button
              onClick={() => selectApp(app)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-colors ${
                selectedApp === app
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="truncate">{app}</span>
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 ml-1 transition-transform ${expandedApp === app ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expandedApp === app && (
              <div className="ml-4 border-l border-white/10 pl-2 py-1">
                {data?.dates[app]?.length ? data.dates[app].map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                      selectedDate === date
                        ? 'bg-brand-teal/30 text-brand-lighter font-medium'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {date}
                  </button>
                )) : (
                  <p className="px-3 py-1.5 text-xs text-white/30">{t.noLogs}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 px-4 py-3">
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {t.signOut}
        </button>
      </div>
    </aside>
  );
}
