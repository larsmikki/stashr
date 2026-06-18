import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Surface } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-black tracking-tight gradient-text text-center mb-8">Stashr</h1>
        <form onSubmit={handleSubmit} className="p-6">
          <Surface className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
                {error}
              </div>
            )}
            <label htmlFor="password" className="block text-xs uppercase tracking-wider font-semibold text-text2 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              className="mt-4"
              disabled={loading || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Surface>
        </form>
      </div>
    </div>
  );
}