import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { hapticSelection } from '../../utils/haptics';

interface QuantityPickerProps {
  label?: string;
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
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const clampValue = (next: number) => Math.min(max, Math.max(min, next));

  const updateValue = (next: number) => {
    const safe = clampValue(next);
    if (safe !== value) {
      hapticSelection();
      onChange(safe);
    }
    setDraftValue(String(safe));
  };

  const handleManualCommit = () => {
    const parsed = Number(draftValue.replace(/\D/g, ''));
    if (!Number.isFinite(parsed)) {
      setDraftValue(String(value));
      return;
    }
    updateValue(parsed);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.picker, { backgroundColor: t.surface, borderColor: t.border }]}> 
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => updateValue(value - 1)}
          activeOpacity={0.7}
          disabled={value <= min}
        >
          <Minus size={16} color={value <= min ? t.placeholder : t.textPrimary} />
        </TouchableOpacity>

        <TextInput
          value={draftValue}
          onChangeText={(txt) => setDraftValue(txt.replace(/\D/g, '').slice(0, 3))}
          onBlur={handleManualCommit}
          onSubmitEditing={handleManualCommit}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={3}
          style={[styles.valueInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.inputBg }]}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => updateValue(value + 1)}
          activeOpacity={0.7}
          disabled={value >= max}
        >
          <Plus size={16} color={value >= max ? t.placeholder : t.textPrimary} />
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
    gap: Spacing.sm,
  },
  label: { ...Typography.subtitle, flex: 1 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.chip,
    gap: Spacing.xs,
    borderWidth: 1,
    padding: 3,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  valueInput: {
    ...Typography.bodyBold,
    minWidth: 48,
    textAlign: 'center',
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
});
