/**
 * Dainik Rojgar — Unified Design System
 * ─────────────────────────────────────
 * Single source of truth for every visual constant used across the app.
 * Dominant Yellow Theme (Rapido/Uber-style premium on-demand marketplace).
 *
 * Font note: Designed for 'Plus Jakarta Sans' (preferred) or 'Inter'.
 * To activate the real webfont, install & load it once in App.tsx:
 *
 *   npx expo install expo-font @expo-google-fonts/plus-jakarta-sans
 *
 *   const [fontsLoaded] = useFonts({
 *     PlusJakartaSans_400Regular,
 *     PlusJakartaSans_600SemiBold,
 *     PlusJakartaSans_700Bold,
 *   });
 *
 * Until then, `typography.fontFamily` values fall back to the platform
 * system font automatically (React Native ignores unknown fontFamily names
 * on native, and the web fallback below covers Expo web).
 */

export const colors = {
  // Core brand accent — Safety Yellow
  primary: '#FFC107',
  primaryDark: '#E6AC00', // pressed/active state
  primarySoft: '#FFF3D6', // subtle yellow tint for highlights/backgrounds

  // Neutral surfaces
  background: '#F9FAFB', // soft light grey — app background
  card: '#FFFFFF', // pure white — card surfaces
  border: '#E5E7EB',

  // Text
  textPrimary: '#111827', // dark charcoal
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#111827', // dark charcoal on yellow (contrast requirement)
  textInverse: '#FFFFFF',

  // Semantic
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  info: '#2563EB',

  // Overlays / glassmorphism
  glassFill: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.35)',
  scrim: 'rgba(17, 24, 39, 0.45)',

  // Milestone progress
  milestoneComplete: '#FFC107',
  milestoneUpcoming: '#E5E7EB',
} as const;

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular, Inter, Plus Jakarta Sans, System',
    medium: 'Inter_500Medium, Inter, Plus Jakarta Sans, System',
    semiBold: 'Inter_600SemiBold, Inter, Plus Jakarta Sans, System',
    bold: 'Inter_700Bold, Inter, Plus Jakarta Sans, System',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 32,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 22,
    lg: 26,
    xl: 28,
    xxl: 32,
    display: 40,
  },
} as const;

/** Uniform 16px horizontal screen padding, per layout-safety requirement */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  screenHorizontal: 16,
} as const;

/** Uniform 16px border radius for all interactive cards */
export const radius = {
  sm: 8,
  md: 12,
  badge: 12,
  input: 12,
  button: 16,
  card: 16, // standard for every interactive card
  pill: 999, // toggles, chips, geo pill
} as const;

/**
 * 4% soft elevation shadow for white card surfaces.
 * Spread across both iOS (shadow*) and Android (elevation) shadow models.
 */
export const shadow = {
  card: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  floating: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const theme = { colors, typography, spacing, radius, shadow };

export default theme;
