/**
 * Centralized Color Design Token System
 *
 * Maps semantic color names to Tailwind theme variables.
 * These correspond to CSS custom properties defined in @theme directive.
 */

export const colorTokens = {
  // Primary brand color
  primary: 'primary',

  // Status colors
  status: {
    healthy: 'status-healthy',
    degraded: 'status-degraded',
    warning: 'status-warning',
    offline: 'status-offline',
  },

  // Semantic colors
  semantic: {
    error: 'error',
    warning: 'warning',
    success: 'success',
    info: 'info',
  },

  // UI component colors (dark mode specific)
  ui: {
    cardDark: 'bg-surface-dark',
    borderDark: 'ui-border-dark',
    hoverDark: 'ui-hover-dark',
    textMutedDark: 'text-muted-dark',
    textSecondaryDark: 'text-dim-dark',
  }
} as const;

/**
 * Status color mapping for dynamic components
 * Returns the appropriate Tailwind color class for a given status
 */
export const statusColorClasses = {
  healthy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    pulse: 'bg-emerald-500',
    border: 'border-emerald-500/20',
  },
  degraded: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    pulse: 'bg-red-500',
    border: 'border-red-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    pulse: 'bg-amber-500',
    border: 'border-amber-500/20',
  },
  offline: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-500',
    pulse: 'bg-slate-500',
    border: 'border-slate-500/20',
  },
} as const;

/**
 * Incident/Error level color classes
 */
export const incidentColorClasses = {
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  success: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
} as const;

/**
 * Get CSS variable reference for direct use in inline styles
 * @param token - The color token name (without --color- prefix)
 * @returns CSS variable reference string
 */
export function getCSSVariable(token: string): string {
  return `var(--color-${token})`;
}
