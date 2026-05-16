import { create } from 'zustand';
import { FlatEvent } from '../types/rilog';
import type { Lang, Translations } from '../i18n';
import { translations } from '../i18n';

export interface Filters {
  eventTypes: Set<number>;
  sessionToken: string;
  urlPattern: string;
  statusFilter: 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'error';
  labelFilter: string;
  search: string;
}

export type Theme = 'light' | 'dark';

interface Store {
  // Auth
  token: string | null;
  setToken: (token: string | null) => void;

  // Language
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Navigation — persisted to localStorage
  selectedApp: string | null;
  selectedDate: string | null;
  setSelectedApp: (app: string) => void;
  setSelectedDate: (date: string) => void;

  // Event selection
  selectedEvent: FlatEvent | null;
  setSelectedEvent: (event: FlatEvent | null) => void;

  // Filters
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleEventType: (type: number) => void;
  resetFilters: () => void;
}

const defaultFilters: Filters = {
  eventTypes: new Set(),
  sessionToken: '',
  urlPattern: '',
  statusFilter: 'all',
  labelFilter: '',
  search: '',
};

// Apply stored theme immediately before first render
const storedTheme = (localStorage.getItem('rilog_theme') as Theme | null) ?? 'light';
if (storedTheme === 'dark') document.documentElement.classList.add('dark');

const storedLang = (localStorage.getItem('rilog_lang') as Lang | null) ?? 'en';

export const useStore = create<Store>((set) => ({
  token: localStorage.getItem('rilog_token'),
  setToken: (token) => {
    if (token) localStorage.setItem('rilog_token', token);
    else localStorage.removeItem('rilog_token');
    set({ token });
  },

  lang: storedLang,
  t: translations[storedLang],
  setLang: (lang) => {
    localStorage.setItem('rilog_lang', lang);
    set({ lang, t: translations[lang] });
  },

  theme: storedTheme,
  setTheme: (theme) => {
    localStorage.setItem('rilog_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  selectedApp: localStorage.getItem('rilog_app'),
  selectedDate: localStorage.getItem('rilog_date'),
  setSelectedApp: (app) => {
    localStorage.setItem('rilog_app', app);
    localStorage.removeItem('rilog_date');
    set({ selectedApp: app, selectedDate: null, selectedEvent: null });
  },
  setSelectedDate: (date) => {
    if (date) localStorage.setItem('rilog_date', date);
    else localStorage.removeItem('rilog_date');
    set({ selectedDate: date || null, selectedEvent: null, filters: { ...defaultFilters } });
  },

  selectedEvent: null,
  setSelectedEvent: (event) => set({ selectedEvent: event }),

  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  toggleEventType: (type) =>
    set((s) => {
      const next = new Set(s.filters.eventTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { filters: { ...s.filters, eventTypes: next } };
    }),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
