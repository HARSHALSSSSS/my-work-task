import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { hapticSelection } from '../../utils/haptics';

interface QuantityPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export const QuantityPicker: React.FC<QuantityPickerProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}) => {
  const { colors: t } = useThemeStore();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <View style={[styles.picker, { backgroundColor: t.surface }]}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => { if (value > min) { hapticSelection(); onChange(value - 1); } }}
          activeOpacity={0.7}
        >
          <Minus size={16} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.value, { color: t.textPrimary }]}>{String(value).padStart(2, '0')}</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => { if (value < max) { hapticSelection(); onChange(value + 1); } }}
          activeOpacity={0.7}
        >
          <Plus size={16} color={t.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { ...Typography.h4 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.chip,
    gap: 12,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  value: { ...Typography.bodyBold, minWidth: 28, textAlign: 'center' },
});
