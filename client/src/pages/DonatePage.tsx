import { useTheme } from '@/contexts/ThemeContext';

const DonatePage = () => {
  const { theme } = useTheme();

  const sectionStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  };

  const cardStyle = {
    background: theme.surface2,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
  };

  const gradientBtnStyle = {
    background: theme.gradient,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    boxShadow: `0 4px 14px ${theme.accent}30`,
    fontFamily: 'inherit',
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'center' as const,
    gap: '6px',
  };

  const badges = [
    { icon: '🛡️', label: '100% Free Forever', color: '#22c55e' },
    { icon: '🔒', label: 'No Ads or Tracking', color: '#f59e0b' },
    { icon: '💾', label: 'Your data, your device', color: '#8b5cf6' },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>
          Support Stashy
        </h1>
        <p className="text-sm mt-0.5" style={{ color: theme.text2 }}>
          I build privacy-first, self-hosted tools — no subscriptions, no ads, no tracking. Your data stays yours.
        </p>
      </div>

      {/* What you get */}
      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>What you get</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Everything, forever — no strings attached.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px' }}>
          {badges.map(({ icon, label, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                background: `${color}15`,
                color,
                border: `1px solid ${color}20`,
              }}
            >
              <span>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Donation cards */}
      <div style={{ ...sectionStyle }}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Donate</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Every contribution keeps Stashy free for everyone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>☕</div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: theme.text }}>Buy Me a Coffee</h3>
              <p style={{ fontSize: '12px', color: theme.text2, marginTop: '2px' }}>One-time donation</p>
            </div>
            <button
              style={gradientBtnStyle}
              onClick={() => window.open('https://buymeacoffee.com/larsmikki', '_blank')}
            >
              ☕ Buy Me a Coffee
            </button>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💙</div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: theme.text }}>PayPal</h3>
              <p style={{ fontSize: '12px', color: theme.text2, marginTop: '2px' }}>Secure donation</p>
            </div>
            <button
              style={gradientBtnStyle}
              onClick={() => window.open('https://paypal.me/larsmikki', '_blank')}
            >
              ❤️ Donate via PayPal
            </button>
          </div>
        </div>
      </div>

      {/* Thank you */}
      <div style={{ ...sectionStyle, marginBottom: 0, textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Thank You!</h2>
        <p className="text-xs" style={{ color: theme.text2 }}>
          Every bit of support keeps Stashy free for everyone. Keep stashing!
        </p>
      </div>
    </div>
  );
};

export default DonatePage;
