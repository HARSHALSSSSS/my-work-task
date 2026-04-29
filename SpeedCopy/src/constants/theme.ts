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
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  h2: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
  },
  h3: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  h4: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 23,
  },
  subtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  small: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  tiny: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 13,
  },
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const Radii = {
  card: 16,
  button: 10,
  input: 10,
  chip: 16,
  section: 13,
  small: 8,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }),
  small: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 7,
    },
    android: {
      elevation: 2,
    },
  }),
} as const;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
