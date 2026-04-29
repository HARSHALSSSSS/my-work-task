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
      {label && <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>}
      <TextInput
        style={[styles.input, { backgroundColor: t.inputBg, color: t.textPrimary }, error && styles.inputError, style]}
        placeholderTextColor={t.placeholder}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...Typography.h4 },
  input: {
    ...Typography.body,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  inputError: { borderWidth: 1, borderColor: Colors.red },
  error: { ...Typography.small, color: Colors.red },
});
