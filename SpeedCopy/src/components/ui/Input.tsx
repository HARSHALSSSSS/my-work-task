import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...rest }) => {
  const { colors: t } = useThemeStore();

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: t.inputBg,
            color: t.textPrimary,
            borderColor: error ? Colors.red : t.border,
          },
          style,
        ]}
        placeholderTextColor={t.placeholder}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: { ...Typography.subtitle },
  input: {
    ...Typography.body,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 42,
    borderWidth: 1,
  },
  error: { ...Typography.small, color: Colors.red },
});
