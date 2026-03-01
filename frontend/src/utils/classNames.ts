/**
 * Utility for combining class names conditionally
 * Useful for dynamic styling with theme tokens
 *
 * @example
 * cn('base-class', isActive && 'active-class', 'another-class')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Common component style patterns using theme system
 * Provides consistent styling across the application
 */
export const stylePresets = {
  // Card components
  card: 'bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl',
  cardDark: 'bg-white dark:bg-bg-surface-dark/50 border border-slate-200 dark:border-ui-border-dark rounded-xl',

  // Input fields
  input: 'bg-slate-100 dark:bg-ui-hover-dark border-none rounded-lg focus:ring-2 focus:ring-primary',
  inputWithBorder: 'bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg focus:ring-2 focus:ring-primary',

  // Buttons
  button: 'px-4 py-2 rounded-lg font-bold text-sm transition-colors',
  buttonPrimary: 'px-4 py-2 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors',
  buttonSecondary: 'px-4 py-2 rounded-lg font-bold text-sm bg-slate-100 dark:bg-ui-hover-dark text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-ui-active-dark transition-colors',
  buttonGhost: 'px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 dark:hover:bg-ui-hover-dark transition-colors',

  // Text colors
  textMuted: 'text-slate-500 dark:text-text-muted-dark',
  textSecondary: 'text-slate-600 dark:text-text-secondary-dark',
  textPrimary: 'text-slate-900 dark:text-text-base-dark',

  // Borders
  border: 'border-slate-200 dark:border-ui-border-dark',
  borderBottom: 'border-b border-slate-200 dark:border-ui-border-dark',

  // Backgrounds
  bgMuted: 'bg-slate-50 dark:bg-ui-hover-dark/50',
  bgSecondary: 'bg-slate-100 dark:bg-ui-hover-dark',
  bgHover: 'hover:bg-slate-50 dark:hover:bg-ui-hover-dark/50',
} as const;
