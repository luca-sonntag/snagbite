import type { CSSProperties } from 'react';

/**
 * Accent colors for the tinted-surface utilities. Kept as raw values so the
 * same tint works for inline gradients, borders and glows.
 */
export const TINT = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
  teal: '#14b8a6',
  slate: '#94a3b8',
} as const;

/**
 * Builds the style object for the `.tint-surface` / `.tint-surface-strong` /
 * `.tint-wash` classes defined in index.css.
 *
 * Usage: <div className="tint-surface" style={tint(TINT.emerald)} />
 */
export function tint(color: string): CSSProperties {
  return { '--tint': color } as CSSProperties;
}
