'use client';

import { useTheme } from '@/lib/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i className={theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
    </button>
  );
}
