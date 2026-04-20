import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Reference the CSS custom properties — keeps brand tokens as a
        // single source of truth. Do not duplicate hex values here.
        'ml-red': 'var(--ml-red)',
        'ml-charcoal': 'var(--ml-charcoal)',
        'ml-light-grey': 'var(--ml-light-grey)',
        'ml-gold-light': 'var(--ml-gold-light)',
        'ml-gold-mid': 'var(--ml-gold-mid)',
        'ml-gold-dark': 'var(--ml-gold-dark)',
        'ml-off-white': 'var(--ml-off-white)',
      },
      fontFamily: {
        // Poppins is loaded via @fontsource/poppins in app/layout.tsx
        sans: [
          'Poppins',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        // Brand type scale — matches docs/BRAND.md
        'ml-hero': ['40px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '900' }],
        'ml-section': ['24px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'ml-subheading': ['17px', { lineHeight: '1.3', fontWeight: '500' }],
        'ml-label': ['13px', { lineHeight: '1.3', fontWeight: '500' }],
        'ml-body': ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        'ml-caption': ['12px', { lineHeight: '1.4', fontWeight: '300' }],
        'ml-legal': ['11px', { lineHeight: '1.4', fontWeight: '300' }],
      },
      borderRadius: {
        'ml-sm': '4px',
        'ml-md': '6px',
        'ml-lg': '8px',
        'ml-xl': '12px',
      },
      transitionTimingFunction: {
        'ml-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ml-in': 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      transitionDuration: {
        'ml-fast': '150ms',
        'ml-base': '200ms',
        'ml-slow': '250ms',
      },
    },
  },
  plugins: [],
};

export default config;
