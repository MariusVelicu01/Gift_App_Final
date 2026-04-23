// GiftApp — design system
// Warm cream palette · rose accent · landing-page style throughout

export const C = {
  // Backgrounds — landing-page warm cream
  bg: '#fff7ed',
  surface: '#ffffff',
  surface2: '#fff1f2',

  // Text — crisp charcoal scale (landing-page)
  text: '#111827',
  textDim: '#4b5563',
  textFaint: '#9ca3af',

  // Borders — warm rose-tinted
  border: '#fce7e0',
  borderStrong: '#fecdd3',

  // Accent — landing-page rose
  accent: '#be123c',
  accentSoft: '#fff1f2',
  accentInk: '#ffffff',

  // Semantic
  sage: '#0d9488',
  sageBg: '#f0fdfa',
  warn: '#b45309',
  warnBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fff1f2',
} as const;

export const R = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const S = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export const F = {
  display: { fontFamily: 'serif' as const, fontWeight: '400' as const },
  displayBold: { fontFamily: 'serif' as const, fontWeight: '500' as const },
  mono: { fontFamily: 'monospace' as const },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
  },
} as const;
