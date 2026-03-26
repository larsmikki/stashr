import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Theme</h2>
      <div className="flex gap-2">
        <button
          onClick={() => dark && toggle()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            !dark
              ? 'bg-white border-2 border-gray-300 text-gray-900'
              : 'bg-gray-900 dark:bg-gray-600 text-white border-2 border-transparent hover:bg-gray-800 dark:hover:bg-gray-500'
          }`}
        >
          <span className="text-base">☀</span> Light
        </button>
        <button
          onClick={() => !dark && toggle()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            dark
              ? 'bg-gray-700 border-2 border-gray-500 text-gray-100'
              : 'bg-gray-900 text-white border-2 border-transparent hover:bg-gray-800'
          }`}
        >
          <span className="text-base">☽</span> Dark
        </button>
      </div>
    </div>
  );
}
