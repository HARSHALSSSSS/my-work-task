import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Typography, Radii, Spacing } from '../../constants/theme';
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
    primary: { backgroundColor: t.textPrimary, borderColor: t.textPrimary, borderWidth: 1 },
    secondary: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 },
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
      onPress={() => {
        hapticLight();
        onPress();
      }}
      disabled={disabled || loading}
      activeOpacity={0.85}
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
    minHeight: 44,
  },
  fullWidth: { alignSelf: 'stretch' },
  smSize: { minHeight: 38, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg },
  mdSize: { minHeight: 44, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  lgSize: { minHeight: 48, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  disabled: { opacity: 0.5 },
  baseText: { ...Typography.bodyBold, textAlign: 'center' },
  smText: { fontSize: 12, lineHeight: 16 },
  mdText: { fontSize: 14, lineHeight: 19 },
  lgText: { fontSize: 15, lineHeight: 21 },
  disabledText: { opacity: 0.8 },
});
