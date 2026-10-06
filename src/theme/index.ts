/**
 * The single source of truth for look and feel.
 * Identity: warm cream paper, coral for action, apricot for delight, olive sage for calm,
 * deep teal-navy ink. Palette taken from the Fetching couple illustration.
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
  background: '#FBF3E8',
  surface: '#FFFCF7',
  surfaceMuted: '#F4E8D6',
  border: '#E6D6BE',
  text: '#12303F',
  textMuted: '#44606E',
  textSubtle: '#5A727F',
  primary: '#C63D22',
  onPrimary: '#FFFFFF',
  primarySoft: '#FCDCCF',
  onPrimarySoft: '#7E2410',
  accent: '#F6BE62',
  onAccent: '#12303F',
  sage: '#D3DAB8',
  onSage: '#323B1B',
  sageStrong: '#566331',
  danger: '#A8182F',
  success: '#2F7A5E',
  overlay: 'rgba(18, 48, 63, 0.45)',
  shadow: '#12303F',
};

export const darkColors: ColorTokens = {
  background: '#0C1A22',
  surface: '#132630',
  surfaceMuted: '#1C3441',
  border: '#2C4654',
  text: '#FBEFDD',
  textMuted: '#B6C6CE',
  textSubtle: '#8FA7B3',
  primary: '#FF7F5F',
  onPrimary: '#12303F',
  primarySoft: '#4B2418',
  onPrimarySoft: '#FFCDBD',
  accent: '#F6BE62',
  onAccent: '#12303F',
  sage: '#2E3A22',
  onSage: '#DCE5BF',
  sageStrong: '#B9C78E',
  danger: '#FF8B9B',
  success: '#8FD0A8',
  overlay: 'rgba(0, 8, 12, 0.6)',
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
