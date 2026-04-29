import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { hapticSelection } from '../../utils/haptics';

interface ChipSelectorProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  collapsible?: boolean;
}

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  label,
  options,
  selected,
  onSelect,
}) => {
  const { colors: t } = useThemeStore();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <View style={[styles.chipContainer, { backgroundColor: t.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.headerText, { color: t.textSecondary }]}>Select option</Text>
        </View>
        <View style={styles.chips}>
          {options.map((opt) => {
            const isActive = selected === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  { borderColor: t.border },
                  isActive && { backgroundColor: t.textPrimary, borderColor: t.textPrimary },
                ]}
                onPress={() => { hapticSelection(); onSelect(opt); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: t.textPrimary }, isActive && { color: t.background }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { ...Typography.h4, textAlign: 'left' },
  chipContainer: {
    borderRadius: Radii.button,
    padding: Spacing.md,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { ...Typography.h4, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radii.chip,
    borderWidth: 1,
  },
  chipText: { ...Typography.body },
});
