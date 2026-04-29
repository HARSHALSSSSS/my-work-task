import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CloudUpload } from 'lucide-react-native';
import { Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';

interface FileUploadBoxProps {
  onPress: () => void;
  fileName?: string;
}

export const FileUploadBox: React.FC<FileUploadBoxProps> = ({ onPress, fileName }) => {
  const { colors: t } = useThemeStore();
  return (
    <View style={[styles.container, { borderColor: t.textPrimary }]}>
      <View style={styles.iconWrap}>
        <CloudUpload size={32} color={t.iconDefault} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{fileName ?? 'Select Files'}</Text>
        {!fileName && (
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Tap to browse PDF or image from your device
          </Text>
        )}
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: t.textPrimary }]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.buttonText, { color: t.background }]}>{fileName ? 'Change File' : 'Choose File'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radii.section,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: { alignItems: 'center', gap: 2 },
  title: { ...Typography.h3, fontSize: 20 },
  subtitle: { ...Typography.body, textAlign: 'center' },
  button: {
    borderRadius: Radii.button,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  buttonText: { ...Typography.body, textAlign: 'center' },
});
