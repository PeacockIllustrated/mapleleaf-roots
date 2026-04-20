/**
 * Mapleleaf brand tokens
 *
 * The single source of truth for colour, typography, spacing, and radius values.
 * NEVER reference raw hex values in component code — always reference these
 * tokens or the corresponding CSS custom properties.
 *
 * CSS custom properties are declared in `app/globals.css`. The TypeScript
 * constants here exist for cases where a TS reference is needed (e.g., Konva
 * fill colours that can't read CSS vars, chart libraries configured in JS).
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const brandColors = {
  // Primary palette
  red: '#E12828',
  charcoal: '#414042',
  lightGrey: '#E6E7E7',

  // Gold gradient (premium accents — use sparingly)
  goldLight: '#F8D3A3',
  goldMid: '#ECBB7F',
  goldDark: '#A96533',

  // Neutrals (derived, for UI work)
  white: '#FFFFFF',
  offWhite: '#F5F2EE',
  black: '#000000',
} as const;

// ---------------------------------------------------------------------------
// Semantic colour roles
// ---------------------------------------------------------------------------

export const semanticColors = {
  actionPrimary: brandColors.red,
  actionSecondary: brandColors.charcoal,
  surfacePanel: brandColors.white,
  surfaceMuted: brandColors.lightGrey,
  textPrimary: brandColors.charcoal,
  textOnDark: brandColors.white,
  textMuted: '#757578',
  accentPremium: brandColors.goldMid,
  borderDefault: 'rgba(65, 64, 66, 0.12)',
  borderStrong: brandColors.charcoal,
} as const;

// ---------------------------------------------------------------------------
// CSS custom property names
// ---------------------------------------------------------------------------

export const cssVars = {
  red: 'var(--ml-red)',
  charcoal: 'var(--ml-charcoal)',
  lightGrey: 'var(--ml-light-grey)',
  goldLight: 'var(--ml-gold-light)',
  goldMid: 'var(--ml-gold-mid)',
  goldDark: 'var(--ml-gold-dark)',
  actionPrimary: 'var(--ml-action-primary)',
  surfacePanel: 'var(--ml-surface-panel)',
  textPrimary: 'var(--ml-text-primary)',
  borderDefault: 'var(--ml-border-default)',
} as const;

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------

export const typography = {
  hero: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 900,
    fontSize: '40px',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  section: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: '24px',
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },
  subheading: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 500,
    fontSize: '17px',
    lineHeight: 1.3,
  },
  label: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 500,
    fontSize: '13px',
    lineHeight: 1.3,
  },
  body: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: 1.55,
  },
  caption: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 300,
    fontSize: '12px',
    lineHeight: 1.4,
  },
  legal: {
    fontFamily: 'Poppins, system-ui, sans-serif',
    fontWeight: 300,
    fontSize: '11px',
    lineHeight: 1.4,
    fontStyle: 'italic' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing scale
// ---------------------------------------------------------------------------

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

// ---------------------------------------------------------------------------
// Radius scale
// ---------------------------------------------------------------------------

export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  pill: '9999px',
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const motion = {
  fast: '150ms',
  base: '200ms',
  slow: '250ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

// ---------------------------------------------------------------------------
// Promo section colours — canonical mapping
// ---------------------------------------------------------------------------
// Mirrors the hex_colour column in promo_sections table. Kept here as a
// fallback for floor-plan rendering when the DB hasn't loaded yet.

export const promoSectionColors: Record<string, string> = {
  SOFT_DRINKS: '#B5D4F4',
  ENERGY_DRINKS: '#85B7EB',
  CONFECTIONERY: '#F4C0D1',
  SNACKS: '#FAC775',
  CHILLED_FOOD_TO_GO: '#9FE1CB',
  MEAL_DEAL: '#5DCAA5',
  BAKERY: '#F8D3A3',
  HOT_DRINKS: '#ECBB7F',
  ALCOHOL: '#A96533',
  TOBACCO_VAPING: '#D3D1C7',
  GROCERIES_AMBIENT: '#C0DD97',
  FROZEN: '#AFA9EC',
  HOUSEHOLD_CLEANING: '#CECBF6',
  MOTOR_CARE: '#534AB7',
  IMPULSE_TILL_POINT: '#ED93B1',
  FORECOURT: '#E24B4A',
  SEASONAL: '#F5C4B3',
} as const;
