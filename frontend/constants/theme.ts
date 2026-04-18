// Dorita — Gift Companion design system
// Cream palette · terracotta accent · warm charcoal text

export const C = {
  // Backgrounds
  bg: '#FBF7F2',
  surface: '#FFFFFF',
  surface2: '#F4EEE5',

  // Text
  text: '#1F1B16',
  textDim: '#7A6E68',   // rgba(31,27,22, 0.62)
  textFaint: '#A8A19B', // rgba(31,27,22, 0.38)

  // Borders
  border: '#EAE5DF',       // rgba(31,27,22, 0.08)
  borderStrong: '#D4CEC9', // rgba(31,27,22, 0.16)

  // Accent — terracotta
  accent: '#B85C3A',
  accentSoft: '#F7EDE7',
  accentInk: '#FFFFFF',

  // Semantic
  sage: '#547A60',
  sageBg: '#E8F2EB',
  warn: '#B8731A',
  warnBg: '#FEF3E0',
  danger: '#B8402A',
  dangerBg: '#FDECEA',
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
  // Shadows — minimal, warm
  card: {
    shadowColor: '#1F1B16',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Used for floating elements (tab bar, modals)
  float: {
    shadowColor: '#1F1B16',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

// Typography helpers — system serif approximates Fraunces, monospace approximates JetBrains Mono
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
