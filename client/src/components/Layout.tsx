import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function StashIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="stashy-bg" x1="0" y1="0" x2="0" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb7185"/>
          <stop offset="100%" stopColor="#e11d48"/>
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="8" fill="url(#stashy-bg)" />
      <rect x="7" y="9" width="22" height="18" rx="2" fill="none" stroke="white" strokeWidth="2" opacity="0.95"/>
      <polygon points="10,24 17,15 24,24" fill="white" opacity="0.7"/>
      <polygon points="18,24 23,17 29,24" fill="white" opacity="0.5"/>
      <circle cx="24" cy="14" r="2.5" fill="white" opacity="0.85"/>
    </svg>
  );
}

export default function Layout() {
  const { passwordSet, authenticated, logout } = useAuth();

  const handleLock = () => {
    if (window.confirm('Lock Stashy? You will need to enter the password again.')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            <StashIcon />
            Stashy
          </Link>
          <div className="flex items-center gap-2">
            {passwordSet && authenticated && (
              <button
                onClick={handleLock}
                className="p-2 rounded-md bg-gray-100 border border-gray-200 text-green-600 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-green-400 dark:hover:bg-gray-600 transition-colors"
                title="Lock"
                aria-label="Lock"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </button>
            )}
            <Link
              to="/settings"
              className="p-2 rounded-md bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
