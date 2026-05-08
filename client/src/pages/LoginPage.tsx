import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);
    try {
      await login(password);
    } catch {
      setError('Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: theme.bg }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-black tracking-tight gradient-text text-center mb-8">Stashy</h1>
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}
          <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: theme.text2 }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              border: `1px solid ${theme.border}`,
              background: theme.surface2,
              color: theme.text,
            }}
            placeholder="Enter password"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: theme.gradient, border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
