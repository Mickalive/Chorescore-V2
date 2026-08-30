/**
 * ChoreScore V2 — Design System Theme
 *
 * Warm, self-care aesthetic: feel-good, contemporary, energetic but not childish.
 * - Never pure white dominant
 * - Warm tinted backgrounds
 * - Light colored surfaces
 * - Clean typography
 * - Semantic colors for states only
 */

export const colors = {
  // Primary warm palette
  primary: '#E07A5F',       // Warm terracotta
  primaryLight: '#F2CC8F',  // Light amber
  primaryDark: '#C1440E',   // Deep terracotta

  // Backgrounds (never pure white)
  background: '#FFF8F0',    // Warm cream
  surface: '#FFFFFF',       // Slightly tinted white
  surfaceAlt: '#FFF0E6',    // Light peach surface
  surfaceHighlight: '#FFE8D6', // Highlighted surface

  // Text hierarchy
  text: '#3D405B',          // Dark blue-gray (primary text)
  textSecondary: '#81B29A', // Sage green (secondary text)
  textMuted: '#A8A8B3',     // Muted text
  textOnPrimary: '#FFFFFF', // Text on primary color

  // Semantic states
  success: '#81B29A',       // Sage green
  error: '#E07A5F',         // Terracotta (same as primary for consistency)
  warning: '#F2CC8F',       // Amber
  info: '#3D85C6',          // Soft blue

  // Dividers and borders
  border: '#E8E0D8',        // Warm gray
  divider: '#F0E8E0',       // Very light warm divider

  // Chart colors (not identity-based, just for variety)
  chartColors: [
    '#E07A5F', // Terracotta
    '#81B29A', // Sage
    '#F2CC8F', // Amber
    '#3D405B', // Blue-gray
    '#C1440E', // Deep terracotta
    '#81B29A', // Sage
  ],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

export const typography = {
  // Font sizes following DESIGN_BRIEF hierarchy
  screenTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  // Large numbers for scores/durations
  metric: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  // Balance values
  balance: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
};

export const shadows = {
  // Very subtle shadows as per DESIGN_CONTRACT
  small: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Complete theme object
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export type Theme = typeof theme;
