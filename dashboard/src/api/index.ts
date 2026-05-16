import { apiDelete, apiGet, apiPost } from './client';
import { LogEntry } from '../types/rilog';

export interface AppsData {
  apps: string[];
  dates: Record<string, string[]>;
}

export interface LogsResponse {
  entries: LogEntry[];
  meta: {
    app: string;
    date: string;
    parts: number;
    totalBatches: number;
    totalEvents: number;
  };
}

export interface AuthStatus {
  enabled: boolean;
}

export interface LoginResponse {
  result: string;
  token?: string;
  message?: string;
}

export interface DeleteResponse {
  result: string;
  deleted: number;
}

export const api = {
  getAuthStatus: () => apiGet<AuthStatus>('/api/auth/status'),

  login: (password: string) =>
    apiPost<LoginResponse>('/api/auth/login', { password }),

  logout: () => apiPost<{ result: string }>('/api/auth/logout', {}),

  getApps: () => apiGet<AppsData>('/api/apps'),

  getLogs: (appName: string, date: string) =>
    apiGet<LogsResponse>(`/api/logs/${encodeURIComponent(appName)}/${date}`),

  deleteLogs: (appName: string, date: string) =>
    apiDelete<DeleteResponse>(`/api/logs/${encodeURIComponent(appName)}/${date}`),
};
