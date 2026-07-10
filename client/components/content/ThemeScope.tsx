'use client';

import { useTheme } from '@/lib/ThemeContext';

/**
 * Applies the `dark` class to an authenticated-app subtree instead of `<html>`. Tailwind's
 * `dark:` variant only needs `.dark` on an ancestor, and scoping it here keeps login/signup
 * outside the app theme while letting each protected panel opt into the same persisted choice.
 */
export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>;
}
