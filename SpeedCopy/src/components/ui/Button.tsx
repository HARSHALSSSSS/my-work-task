import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Radii, Shadows } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { hapticLight } from '../../utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const { colors: t } = useThemeStore();

  const variantBg: Record<string, ViewStyle> = {
    primary: { backgroundColor: t.textPrimary },
    secondary: { backgroundColor: t.surface },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.textPrimary },
    ghost: { backgroundColor: 'transparent' },
  };

  const variantTxt: Record<string, TextStyle> = {
    primary: { color: t.background },
    secondary: { color: t.textPrimary },
    outline: { color: t.textPrimary },
    ghost: { color: t.textPrimary },
  };

  const containerStyles: ViewStyle[] = [
    styles.base,
    variantBg[variant],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const labelStyles: TextStyle[] = [
    styles.baseText,
    variantTxt[variant],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={() => { hapticLight(); onPress(); }}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? t.background : t.textPrimary} />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  smSize: { paddingVertical: 8, paddingHorizontal: 16 },
  mdSize: { paddingVertical: 14, paddingHorizontal: 20 },
  lgSize: { paddingVertical: 18, paddingHorizontal: 24 },
  disabled: { opacity: 0.5 },
  baseText: { ...Typography.bodyBold, textAlign: 'center' },
  smText: { fontSize: 14 },
  mdText: { fontSize: 16 },
  lgText: { fontSize: 18 },
  disabledText: { opacity: 0.7 },
});
