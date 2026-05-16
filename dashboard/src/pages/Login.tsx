import { useState, FormEvent } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import logoUrl from '../assets/Logo-base.svg';

export function Login() {
  const { setToken, lang, setLang, t } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(password);
      if (res.result === 'SUCCESS' && res.token) {
        setToken(res.token);
      } else {
        setError(res.message ?? t.wrongPassword);
      }
    } catch {
      setError(t.wrongPassword);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center p-4">
      {/* Language toggle — top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1 text-xs">
        <button
          onClick={() => setLang('en')}
          className={`px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-white/30 text-brand-dark font-medium' : 'text-brand-dark/60 hover:text-brand-dark'}`}
        >
          EN
        </button>
        <span className="text-brand-dark/30">|</span>
        <button
          onClick={() => setLang('uk')}
          className={`px-2 py-1 rounded transition-colors ${lang === 'uk' ? 'bg-white/30 text-brand-dark font-medium' : 'text-brand-dark/60 hover:text-brand-dark'}`}
        >
          UK
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="flex justify-center mb-8">
          <img src={logoUrl} alt="Rilog" className="h-10" />
        </div>

        <h1 className="text-xl font-semibold text-brand-dark text-center mb-1">{t.welcomeBack}</h1>
        <p className="text-sm text-gray-400 text-center mb-6">{t.enterPassword}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition"
          />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-brand-dark hover:bg-opacity-90 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
