import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store/useStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

export function App() {
  const { token, setToken } = useStore();

  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.getAuthStatus,
    staleTime: Infinity,
  });

  // Listen for 401 events dispatched by the API client
  useEffect(() => {
    const handler = () => setToken(null);
    window.addEventListener('rilog:unauthorized', handler);
    return () => window.removeEventListener('rilog:unauthorized', handler);
  }, [setToken]);

  const authRequired = authStatus?.enabled ?? false;
  const isAuthenticated = !authRequired || Boolean(token);

  if (!isAuthenticated) return <Login />;
  return <Dashboard />;
}
