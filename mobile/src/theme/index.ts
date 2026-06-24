import { TextStyle } from 'react-native';
import { colors } from './colors';

export { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Familles de polices chargées via expo-google-fonts (voir useAppFonts). */
export const fonts = {
  display: 'Fredoka_600SemiBold', // titres arrondis
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodySemiBold: 'Poppins_600SemiBold',
  bodyBold: 'Poppins_700Bold',
} as const;

export const type = {
  h1: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.brown } as TextStyle,
  h2: { fontFamily: fonts.display, fontSize: 22, color: colors.brown } as TextStyle,
  h3: { fontFamily: fonts.display, fontSize: 18, color: colors.brown } as TextStyle,
  title: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.ink } as TextStyle,
  bodyMuted: { fontFamily: fonts.body, fontSize: 14, color: colors.grey } as TextStyle,
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink } as TextStyle,
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.grey } as TextStyle,
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.white } as TextStyle,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const theme = { colors, spacing, radii, fonts, type, shadow };
export default theme;
