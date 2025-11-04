import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/20 transition-all duration-200 group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun icon (visible in dark mode) */}
      <Sun 
        className={`w-5 h-5 text-amber-500 transition-all duration-300 ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0 absolute inset-0 m-auto'
        }`}
      />
      
      {/* Moon icon (visible in light mode) */}
      <Moon 
        className={`w-5 h-5 text-indigo-600 transition-all duration-300 ${
          theme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0 absolute inset-0 m-auto'
        }`}
      />
    </button>
  );
}