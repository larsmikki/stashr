import { useTheme } from '@/contexts/ThemeContext';
import { Button, Surface } from '@/components/ui';

const ShieldIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M10 1.944 3.5 4.111v4.842c0 4.045 2.64 7.618 6.5 8.756 3.86-1.138 6.5-4.711 6.5-8.756V4.111L10 1.944Zm3.354 6.41a.75.75 0 0 0-1.061-1.061L9 10.586 7.707 9.293a.75.75 0 0 0-1.061 1.061l1.823 1.823a.75.75 0 0 0 1.061 0l3.824-3.823Z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5 8V6a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 17 9.5v7A1.5 1.5 0 0 1 15.5 18h-11A1.5 1.5 0 0 1 3 16.5v-7A1.5 1.5 0 0 1 4.5 8H5Zm2 0h6V6a3 3 0 1 0-6 0v2Z" clipRule="evenodd" />
  </svg>
);

const DriveIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2h7A2.5 2.5 0 0 1 16 4.5v11A2.5 2.5 0 0 1 13.5 18h-7A2.5 2.5 0 0 1 4 15.5v-11Zm2 9.75A.75.75 0 0 0 6.75 15h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0-.75.75Zm7-9.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
  </svg>
);

const CoffeeIcon = () => (
  <svg className="h-9 w-9 mx-auto" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 6.75A1.75 1.75 0 0 1 5.75 5h9.5A1.75 1.75 0 0 1 17 6.75V8h1.25a3.25 3.25 0 0 1 .42 6.473A7.002 7.002 0 0 1 5 12V6.75Zm13 2.75V12c0 .294-.018.584-.053.868A1.75 1.75 0 1 0 18.25 9.5H17ZM4 18.25a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75Z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="h-9 w-9 mx-auto" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="m10 17.25-1.025-.933C5.35 13.025 3 10.892 3 8.275 3 6.142 4.675 4.5 6.8 4.5c1.2 0 2.35.558 3.1 1.433A4.087 4.087 0 0 1 13 4.5c2.125 0 3.8 1.642 3.8 3.775 0 2.617-2.35 4.75-5.975 8.05L10 17.25Z" />
  </svg>
);

export default function DonatePage() {
  const { theme } = useTheme();

  const badges = [
    { icon: <ShieldIcon />, label: '100% free forever', color: '#22c55e' },
    { icon: <LockIcon />, label: 'No ads or tracking', color: '#f59e0b' },
    { icon: <DriveIcon />, label: 'Your data, your device', color: theme.accent },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-text">
          Support Stashr
        </h1>
        <p className="text-sm mt-0.5 text-text2">
          I build privacy-first, self-hosted tools with no subscriptions, no ads, and no tracking. Your data stays yours.
        </p>
      </div>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">What you get</h2>
        <p className="text-xs text-text2 mb-5">
          Everything, forever — no strings attached.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {badges.map(({ icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
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
      </Surface>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Donate</h2>
        <p className="text-xs text-text2 mb-5">
          Every contribution keeps Stashr free for everyone.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-6 rounded-xl border" style={{ background: theme.surface2, borderColor: theme.border, textAlign: 'center' }}>
            <div className="mb-3" style={{ color: theme.accent }}><CoffeeIcon /></div>
            <div className="mb-4">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Buy Me a Coffee</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>One-time donation</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.open('https://buymeacoffee.com/larsmikki', '_blank')}
            >
              Buy Me a Coffee
            </Button>
          </div>
          <div className="p-6 rounded-xl border" style={{ background: theme.surface2, borderColor: theme.border, textAlign: 'center' }}>
            <div className="mb-3" style={{ color: theme.accent }}><HeartIcon /></div>
            <div className="mb-4">
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>PayPal</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>Secure donation</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.open('https://paypal.me/larsmikki', '_blank')}
            >
              Donate via PayPal
            </Button>
          </div>
        </div>
      </Surface>

      <Surface className="p-6 text-center">
        <div className="mb-2" style={{ color: theme.accent }}><HeartIcon /></div>
        <h2 className="text-base font-bold mb-1 text-text">Thank you</h2>
        <p className="text-xs text-text2">
          Every bit of support keeps Stashr free for everyone.
        </p>
      </Surface>
    </div>
  );
}
