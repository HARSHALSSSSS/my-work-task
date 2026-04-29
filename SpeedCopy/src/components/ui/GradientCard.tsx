import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  title: string;
  subtitle: string;
  colors: readonly [string, string, ...string[]];
  onPress: () => void;
  icon?: React.ReactNode;
  image?: ImageSourcePropType;
  imageBgColor?: string;
  imageStyle?: StyleProp<ImageStyle>;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  title,
  subtitle,
  colors,
  onPress,
  icon,
  image,
  imageBgColor,
  imageStyle,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
    <LinearGradient
      colors={colors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {image ? (
          imageBgColor ? (
            <View style={[styles.imageWrap, { backgroundColor: imageBgColor }]}>
              <Image source={image} style={[styles.cardImage, imageStyle]} resizeMode="cover" />
            </View>
          ) : (
            <Image source={image} style={[styles.cardImageLegacy, imageStyle]} resizeMode="contain" />
          )
        ) : icon ? (
          <View style={styles.iconWrap}>{icon}</View>
        ) : null}
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    minHeight: 140,
  },
  textWrap: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  iconWrap: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
  },
  imageWrap: {
    width: 118,
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    opacity: 0.98,
  },
  cardImageLegacy: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
});
