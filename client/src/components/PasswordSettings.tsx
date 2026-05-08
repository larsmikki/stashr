import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LockIcon, UnlockIcon } from '@/components/Layout';
import * as api from '@/api/client';

export default function PasswordSettings() {
  const { passwordSet, refreshAuth } = useAuth();
  const { theme } = useTheme();
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
      setSuccess('Password removed — app is now open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="settings-error">{error}</div>
      )}
      {success && (
        <div className="settings-success">{success}</div>
      )}

      {!passwordSet ? (
        <form onSubmit={handleSetPassword} className="password-form">
          <p className="settings-info-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: theme.text2 }}><UnlockIcon /></span>
            No password is set — app is accessible to anyone on your network.
          </p>
          <div className="settings-field">
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a password"
            />
          </div>
          <div className="settings-buttons">
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="btn btn-primary"
            >
              Set Password
            </button>
          </div>
        </form>
      ) : (
        <div className="password-form">
          <p className="settings-info-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: theme.accent }}><LockIcon /></span>
            Password protection is enabled.
          </p>

          <form onSubmit={handleSetPassword}>
            <div className="settings-field">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="change-new-password">New Password</label>
              <input
                id="change-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="settings-buttons">
              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword}
                className="btn btn-primary"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={handleRemovePassword}
                disabled={loading || !currentPassword}
                className="btn btn-danger"
              >
                Remove Password
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
