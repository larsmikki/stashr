import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LockIcon, UnlockIcon } from '@/components/Layout';
import * as api from '@/api';
import { Button, Input, Surface } from '@/components/ui';

export default function PasswordSettings() {
  const { passwordSet, refreshAuth } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.setPasswordApi(newPassword, currentPassword || undefined);
      await refreshAuth();
      resetForm();
      setSuccess(passwordSet ? 'Password changed successfully' : 'Password set successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.removePasswordApi(currentPassword);
      api.setToken(null);
      await refreshAuth();
      resetForm();
      setSuccess('Password removed. Stashr is now open.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Surface className="mb-4 px-4 py-3 text-sm" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}>
          {error}
        </Surface>
      )}
      {success && (
        <Surface className="mb-4 px-4 py-3 text-sm" style={{ background: '#dcfce7', borderColor: '#bbf7d0', color: '#16a34a' }}>
          {success}
        </Surface>
      )}

      {!passwordSet ? (
        <form onSubmit={handleSetPassword}>
          <p className="text-sm text-text2 flex items-center gap-2 mb-4">
            <span className="text-text2"><UnlockIcon /></span>
            No password is set. Stashr is accessible to anyone on your network.
          </p>
          <div className="mb-4">
            <label htmlFor="new-password" className="block text-xs uppercase tracking-wider font-semibold text-text2 mb-1">Password</label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a password"
            />
          </div>
          <Button variant="primary" type="submit" disabled={loading || !newPassword}>
            Set password
          </Button>
        </form>
      ) : (
        <div>
          <p className="text-sm text-text2 flex items-center gap-2 mb-4">
            <span className="text-accent"><LockIcon /></span>
            Password protection is enabled.
          </p>

          <form onSubmit={handleSetPassword}>
            <div className="mb-4">
              <label htmlFor="current-password" className="block text-xs uppercase tracking-wider font-semibold text-text2 mb-1">Current password</label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="change-new-password" className="block text-xs uppercase tracking-wider font-semibold text-text2 mb-1">New password</label>
              <Input
                id="change-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={loading || !currentPassword || !newPassword}>
                Change password
              </Button>
              <Button variant="danger" type="button" onClick={handleRemovePassword} disabled={loading || !currentPassword}>
                Remove password
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
