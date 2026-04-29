import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Modal, Pressable, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft, ChevronRight, CloudUpload, Briefcase,
  FileText, BookOpen, Disc3, GraduationCap, X,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { PrintingSubService } from '../../types';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useThemeStore } from '../../store/useThemeStore';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'PrintingCategories'>;

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
};

type SubServiceOption = {
  subService: PrintingSubService;
  name: string;
  description: string;
  Icon: typeof FileText;
};

const SUB_SERVICE_DEFS: SubServiceOption[] = [
  {
    subService: 'standard',
    name: `Standard${'\n'}Printing`,
    description: `Perfect for reports &${'\n'}essays`,
    Icon: FileText,
  },
  {
    subService: 'soft',
    name: 'Soft Binding',
    description: `Clean professional${'\n'}look`,
    Icon: BookOpen,
  },
  {
    subService: 'spiral',
    name: 'Spiral Binding',
    description: 'Durable & easy to flip',
    Icon: Disc3,
  },
  {
    subService: 'thesis',
    name: 'Thesis Binding',
    description: `Official university${'\n'}standard`,
    Icon: GraduationCap,
  },
];

const SERVICES: ServiceRow[] = [
  {
    id: 'document',
    name: 'Document Printing',
    description: 'College Prints and doc. prints',
    icon: <CloudUpload size={22} color="#27AE60" />,
    iconBg: 'rgba(39, 174, 96, 0.12)',
  },
  {
    id: 'business',
    name: 'Business Printing',
    description: 'Cards, Flyers & marketing',
    icon: <Briefcase size={22} color="#2F80ED" />,
    iconBg: 'rgba(47, 128, 237, 0.12)',
  },
];

export const PrintingCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [showOverlay, setShowOverlay] = useState(false);
  const { colors: t } = useThemeStore();
  const setMode = useCategoryStore((s) => s.setMode);
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - 48, 360);
  const modalInnerWidth = modalWidth - 40;
  const overlayCardSize = Math.floor((modalInnerWidth - 12) / 2);

  React.useEffect(() => {
    setMode('printing');
  }, [setMode]);

  const onCategoryPress = (id: string) => {
    if (id === 'document') {
      setShowOverlay(true);
    } else {
      navigation.navigate('PrintStore');
    }
  };

  const onSubServiceSelect = (subService: PrintingSubService) => {
    setShowOverlay(false);
    navigation.navigate('Packages', { subService });
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Categories</Text>
        <View style={styles.headerSlot} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.heading, { color: t.textPrimary }]}>Select Printing Type</Text>
        <Text style={[styles.subheading, { color: t.textSecondary }]}>Choose a category for your document.</Text>

        <View style={styles.list}>
          {SERVICES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.85}
              onPress={() => onCategoryPress(s.id)}
            >
              <View style={[styles.iconBox, { backgroundColor: s.iconBg }]}>
                {s.icon}
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.cardTitle, { color: t.textPrimary }]}>{s.name}</Text>
                <Text style={[styles.cardDesc, { color: t.textSecondary }]}>{s.description}</Text>
              </View>
              <ChevronRight size={20} color={t.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Document Printing Sub-service Overlay */}
      <Modal
        visible={showOverlay}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverlay(false)}
      >
        <Pressable style={styles.overlayBackdrop} onPress={() => setShowOverlay(false)}>
          <Pressable style={[styles.overlayContainer, { backgroundColor: t.card, width: modalWidth }]} onPress={() => {}}>
            <View style={styles.overlayHeader}>
              <Text style={[styles.overlayTitle, { color: t.textPrimary }]}>Select Package</Text>
              <TouchableOpacity
                onPress={() => setShowOverlay(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={t.iconDefault} />
              </TouchableOpacity>
            </View>

            <View style={styles.overlayGrid}>
              {SUB_SERVICE_DEFS.map((item) => {
                const SubIcon = item.Icon;
                return (
                  <TouchableOpacity
                    key={item.subService}
                    style={[styles.overlayCard, { backgroundColor: t.chipBg, borderColor: t.divider, width: overlayCardSize, height: overlayCardSize }]}
                    activeOpacity={0.8}
                    onPress={() => onSubServiceSelect(item.subService)}
                  >
                    <View style={[styles.overlayIconCircle, { backgroundColor: t.inputBg }]}>
                      <SubIcon size={28} color={t.iconDefault} />
                    </View>
                    <Text style={[styles.overlayCardTitle, { color: t.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.overlayCardDesc, { color: t.textSecondary }]}>{item.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    minHeight: 52,
    gap: 12,
  },
  headerSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: '#242424',
    textAlign: 'center',
    flex: 1,
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 30,
    color: '#000',
    marginTop: 8,
  },
  subheading: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B6B6B',
    marginBottom: 24,
    marginTop: 4,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    minHeight: 84,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
  },
  cardDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B6B6B',
  },

  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxWidth: 360,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overlayTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    color: '#000',
  },
  overlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  overlayCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'space-between',
  },
  overlayIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overlayCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 36,
  },
  overlayCardDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    lineHeight: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    minHeight: 28,
  },
});

