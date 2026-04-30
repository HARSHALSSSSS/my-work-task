import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { FLOATING_TAB_CLEARANCE } from '../../navigation/AppNavigator';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'CustomColorDescription'>;
type Route = RouteProp<PrintStackParamList, 'CustomColorDescription'>;

export const CustomColorDescriptionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { colors: t } = useThemeStore();
  const [description, setDescription] = useState(params.description || '');

  const handleSave = () => {
    const trimmedDescription = description.trim();
    if (params.returnRouteKey) {
      navigation.dispatch({
        ...CommonActions.setParams({
          customColorDescription: trimmedDescription,
        }),
        source: params.returnRouteKey,
      });
      navigation.goBack();
      return;
    }

    navigation.navigate(params.returnTo || 'StandardPrinting', {
      subService: params.subService,
      deliveryMode: params.deliveryMode,
      locationId: params.locationId,
      servicePackage: params.servicePackage,
      pickupEtaLabel: params.pickupEtaLabel,
      pickupLocationTitle: params.pickupLocationTitle,
      customColorDescription: trimmedDescription,
    });
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Description Page</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: t.textPrimary }]}>Custom Color Description</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Describe page splits, custom colour combinations, special instructions, or any page-specific color request.
          </Text>

          <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Custom color requirement</Text>
            <TextInput
              style={[styles.input, { borderColor: t.border, backgroundColor: t.inputBg, color: t.textPrimary }]}
              placeholder="Example: Pages 1-5 in B&W, pages 6-10 in color, cover page full color"
              placeholderTextColor={t.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: t.border,
              backgroundColor: t.background,
              paddingBottom: FLOATING_TAB_CLEARANCE,
            },
          ]}
        >
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: t.textPrimary }]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={[styles.saveButtonText, { color: t.background }]}>Save description</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.h3,
  },
  subtitle: {
    ...Typography.bodySm,
    marginTop: Spacing.xxs,
    marginBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.section,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: {
    ...Typography.subtitle,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: Radii.input,
    minHeight: 180,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: Radii.button,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...Typography.bodyBold,
    fontFamily: 'Poppins_600SemiBold',
  },
});
