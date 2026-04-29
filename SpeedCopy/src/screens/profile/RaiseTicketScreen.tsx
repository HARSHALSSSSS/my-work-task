import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronDown, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import * as notificationsApi from '../../api/notifications';

const ISSUE_TYPES = ['Delivery Issue', 'Payment Issue', 'Order Issue', 'Product Quality', 'Other'];
const ISSUE_TO_CATEGORY: Record<string, 'delivery_issue' | 'payment_issue' | 'order_issue' | 'product_issue' | 'other'> = {
  'Delivery Issue': 'delivery_issue',
  'Payment Issue': 'payment_issue',
  'Order Issue': 'order_issue',
  'Product Quality': 'product_issue',
  Other: 'other',
};

export const RaiseTicketScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation();
  const storeOrders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const [issueType, setIssueType] = useState('');
  const [orderRelated, setOrderRelated] = useState('');

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const orderOptions = [
    ...storeOrders.map((o) => o.orderNumber || `Order #${o.id.slice(-5)}`),
    'Other',
  ];
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAttachment(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!issueType || !message.trim()) {
      Alert.alert('Error', 'Please select an issue type and describe your issue');
      return;
    }
    const selectedOrder = storeOrders.find(
      (o) => (o.orderNumber || `Order #${o.id.slice(-5)}`) === orderRelated,
    );
    try {
      await notificationsApi.createTicket({
        subject: issueType,
        description: orderRelated && orderRelated !== 'Other'
          ? `${message.trim()}\n\nOrder: ${orderRelated}`
          : message.trim(),
        category: ISSUE_TO_CATEGORY[issueType] || 'other',
        priority: 'medium',
        orderId: selectedOrder?.id,
      });
      Alert.alert('Ticket Submitted', 'We will get back to you as soon as possible.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg =
        e?.serverMessage ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to submit ticket. Please try again later.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Raise a Ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: t.textPrimary }]}>Raise a Support Ticket</Text>
          <Text style={[styles.heroSub, { color: t.textSecondary }]}>
            Tell us about your issue and we'll get back to you as soon as possible
          </Text>
        </View>

        {/* Issue Type */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Issue Type</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: t.inputBg, borderColor: t.border }]}
            onPress={() => { setShowIssueDropdown(!showIssueDropdown); setShowOrderDropdown(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, { color: t.textPrimary }, !issueType && [styles.dropdownPlaceholder, { color: t.placeholder }]]}>
              {issueType || 'Select your issue type'}
            </Text>
            <ChevronDown size={20} color={t.textSecondary} />
          </TouchableOpacity>
          {showIssueDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: t.card, borderColor: t.border }]}>
              {ISSUE_TYPES.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownItem, { borderBottomColor: t.divider }]}
                  onPress={() => { setIssueType(opt); setShowIssueDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: t.textPrimary }, issueType === opt && styles.dropdownItemActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Order Related */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Order Related</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: t.inputBg, borderColor: t.border }]}
            onPress={() => { setShowOrderDropdown(!showOrderDropdown); setShowIssueDropdown(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, { color: t.textPrimary }, !orderRelated && [styles.dropdownPlaceholder, { color: t.placeholder }]]}>
              {orderRelated || 'Select your order'}
            </Text>
            <ChevronDown size={20} color={t.textSecondary} />
          </TouchableOpacity>
          {showOrderDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: t.card, borderColor: t.border }]}>
              {orderOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownItem, { borderBottomColor: t.divider }]}
                  onPress={() => { setOrderRelated(opt); setShowOrderDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: t.textPrimary }, orderRelated === opt && styles.dropdownItemActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Message */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Message</Text>
          <TextInput
            style={[styles.messageInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.textPrimary }]}
            placeholder="Describe your issue in detail"
            placeholderTextColor={t.placeholder}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Attachment */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Attachment</Text>
          <TouchableOpacity style={[styles.attachmentBox, { borderColor: t.border }]} onPress={pickImage} activeOpacity={0.8}>
            {attachment ? (
              <Text style={styles.attachmentAdded}>Photo attached</Text>
            ) : (
              <View style={styles.addPhotoWrap}>
                <Camera size={20} color={t.textSecondary} />
                <Text style={[styles.addPhotoText, { color: t.textSecondary }]}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, minHeight: 40 }} />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: t.textPrimary }]} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={[styles.submitBtnText, { color: t.background }]}>Submit Ticket</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 36,
    color: '#242424',
    textAlign: 'center',
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  heroSection: {
    gap: 6,
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 30,
    color: '#000000',
  },
  heroSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B6B6B',
  },
  fieldGroup: {
    marginBottom: 18,
    zIndex: 1,
  },
  fieldLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#A5A5A5',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000000',
  },
  dropdownItemActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#2F80ED',
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 120,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000000',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  attachmentBox: {
    borderWidth: 1.5,
    borderColor: '#C0C0C0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  addPhotoWrap: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  addPhotoText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#6B6B6B',
  },
  attachmentAdded: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#27AE60',
  },
  submitBtn: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

