/**
 * The single source of truth for look and feel.
 * Identity: warm cream paper, berry for action, butter for delight, sage for calm.
 * Display type is Fraunces (soft serif); UI type is Figtree.
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  /** Text on `background`/`surface` that must stay readable but quiet (>= 4.5:1). */
  textSubtle: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  accent: string;
  onAccent: string;
  sage: string;
  onSage: string;
  sageStrong: string;
  danger: string;
  success: string;
  overlay: string;
  shadow: string;
}

export const lightColors: ColorTokens = {
  background: '#FAF4EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EAE2',
  border: '#E6D8CB',
  text: '#2B1B2E',
  textMuted: '#5F4C62',
  textSubtle: '#76637A',
  primary: '#8A2F5C',
  onPrimary: '#FFFFFF',
  primarySoft: '#F4DAE6',
  onPrimarySoft: '#5E1B3E',
  accent: '#F4C75A',
  onAccent: '#2B1B2E',
  sage: '#C4D8BD',
  onSage: '#24402B',
  sageStrong: '#4A7556',
  danger: '#B3261E',
  success: '#3C7A55',
  overlay: 'rgba(43, 27, 46, 0.45)',
  shadow: '#2B1B2E',
};

export const darkColors: ColorTokens = {
  background: '#17111A',
  surface: '#241A28',
  surfaceMuted: '#2F2334',
  border: '#43344B',
  text: '#F7EEE8',
  textMuted: '#C7B6CA',
  textSubtle: '#A996AD',
  primary: '#EE8DBA',
  onPrimary: '#2B1B2E',
  primarySoft: '#4C2742',
  onPrimarySoft: '#F9D3E5',
  accent: '#F4C75A',
  onAccent: '#2B1B2E',
  sage: '#34503B',
  onSage: '#D5EAD0',
  sageStrong: '#A9CFA9',
  danger: '#FF8A80',
  success: '#8FD0A8',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  displayItalic: {
    fontFamily: fonts.displayItalic,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  titleItalic: {
    fontFamily: fonts.displayItalic,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heading: { fontFamily: fonts.bodySemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 20 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Minimum touch target (points). */
export const hitSize = 48;

export const shadows = {
  card: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  floating: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  fonts: typeof fonts;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
}

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  fonts,
  typography,
  spacing,
  radii,
  shadows,
};
export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  fonts,
  typography,
  spacing,
  radii,
  shadows,
};
