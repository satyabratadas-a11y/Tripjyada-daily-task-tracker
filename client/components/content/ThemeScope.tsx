'use client';

import { useTheme } from '@/lib/ThemeContext';

/**
 * Applies the `dark` class to a wrapper scoped to this subtree only, instead of `<html>` —
 * Tailwind's `dark:` variant just needs `.dark` on any ancestor. Scoping it here keeps dark
 * mode confined to the Content Calendar pages, which were built with `dark:` variants
 * throughout; the older task-tracker pages were not, and would render half-styled if `.dark`
 * ever reached them.
 */
export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>;
}
