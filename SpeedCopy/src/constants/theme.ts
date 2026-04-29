import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FIGMA_WIDTH = 440;

export const scale = (size: number) => (SCREEN_WIDTH / FIGMA_WIDTH) * size;

export const Colors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  black: '#000000',
  textPrimary: '#000000',
  textDark: '#242424',
  textSecondary: '#6B6B6B',
  textMuted: '#424242',

  purplePrimary: '#9A40E8',
  purpleBorder: '#8E2DE2',
  purpleLightBg: '#F7EBFF',

  blueAccent: '#7292FF',
  blueLightBg: '#F2F5FF',

  green: '#00A63E',
  red: '#EB5757',
  warning: '#F5A623',

  lightGray: '#F6F6F6',
  gray: '#A5A5A5',
  darkGray: '#424242',
  borderGray: '#E4E4E4',
  divider: '#E8E8E8',

  cardShadow: 'rgba(0,0,0,0.12)',
  overlay: 'rgba(0,0,0,0.08)',
  overlayDark: 'rgba(0,0,0,0.2)',
} as const;

export const Gradients = {
  printing: ['#4CA1AF', '#2C3E50'] as const,
  gifting: ['#FF7EB3', '#FF758C'] as const,
  shopping: ['#FF39C7', '#A18CD1'] as const,
  refer: ['#FF512F', '#DD2476'] as const,
};

export const Typography = {
  h1: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  h4: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  tiny: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 14,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  card: 20,
  button: 12,
  input: 12,
  chip: 18,
  section: 15,
  small: 8,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  }),
  small: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
  }),
} as const;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
