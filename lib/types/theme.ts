/**
 * Theme type definitions for LinguaLink
 */

export const themeColors = {
  lightMintGreen: '#80ee98',
  aquaGreen: '#46dfb1',
  brightCyan: '#09d1c7',
  tealBlue: '#15919b',
  deepTeal: '#0c6478',
  midnightBlue: '#213a58',
} as const;

export type ThemeColor = keyof typeof themeColors;
export type ThemeColorValue = (typeof themeColors)[ThemeColor];

export const semanticColors = {
  background: '#ffffff',
  backgroundSecondary: '#f8fdf9',
  surface: '#ffffff',
  surfaceHover: '#f0fdf4',
  primary: themeColors.brightCyan,
  primaryHover: '#07b8ae',
  secondary: themeColors.aquaGreen,
  secondaryHover: '#3dc79f',
  accent: themeColors.tealBlue,
  accentHover: '#117a83',
  textPrimary: themeColors.midnightBlue,
  textSecondary: themeColors.deepTeal,
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderFocus: themeColors.brightCyan,
  success: '#22c55e',
  successLight: '#86efac',
  error: '#ef4444',
  errorLight: '#fca5a5',
  warning: '#f59e0b',
  warningLight: '#fcd34d',
} as const;

export type SemanticColor = keyof typeof semanticColors;
export type SemanticColorValue = (typeof semanticColors)[SemanticColor];

export const darkModeColors = {
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
  surface: '#1e293b',
  surfaceHover: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  border: '#334155',
} as const;

export type DarkModeColor = keyof typeof darkModeColors;
export type DarkModeColorValue = (typeof darkModeColors)[DarkModeColor];

// Gradient definitions
export const gradients = {
  mintToCyan: `linear-gradient(135deg, ${themeColors.lightMintGreen} 0%, ${themeColors.brightCyan} 100%)`,
  cyanToMidnight: `linear-gradient(135deg, ${themeColors.brightCyan} 0%, ${themeColors.midnightBlue} 100%)`,
  fullSpectrum: `linear-gradient(135deg, 
    ${themeColors.lightMintGreen} 0%, 
    ${themeColors.aquaGreen} 20%, 
    ${themeColors.brightCyan} 40%, 
    ${themeColors.tealBlue} 60%, 
    ${themeColors.deepTeal} 80%, 
    ${themeColors.midnightBlue} 100%
  )`,
} as const;

export type GradientName = keyof typeof gradients;
export type GradientValue = (typeof gradients)[GradientName];

// Spacing scale
export const spacing = {
  0: 0,
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];

// Typography scale
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type FontSizeValue = (typeof fontSize)[FontSizeKey];

// Animation durations
export const duration = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
} as const;

export type DurationKey = keyof typeof duration;
export type DurationValue = (typeof duration)[DurationKey];
