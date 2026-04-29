import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as userApi from '../../api/user';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, User, Camera } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ProfileStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

export function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const {
    userName, phone, userEmail, profileImage,
    setUserName, setPhone, setUserEmail, setProfileImage,
  } = useAuthStore();

  const [name, setName] = useState(userName);
  const [mobile, setMobile] = useState(phone);
  const [email, setEmail] = useState(userEmail);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }
    setUserName(name.trim());
    setPhone(mobile.trim());
    setUserEmail(email.trim());
    try {
      await userApi.updateProfile({ name: name.trim(), phone: mobile.trim() });
    } catch { /* local state already updated */ }
    navigation.goBack();
  };

  return (
    <SafeScreen>
      <View style={[styles.header, { backgroundColor: t.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarWrap}>
            <LinearGradient
              colors={['#D9D9D9', '#6B6B6B', '#000000']}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.avatarCircle}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: t.divider }]}>
                  <User size={44} color={t.placeholder} strokeWidth={1.2} />
                </View>
              )}
            </LinearGradient>
            <View style={[styles.cameraBadge, { backgroundColor: t.card }]}>
              <Camera size={14} color={t.textPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: '#4CA1AF' }]}>Change Photo</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: t.card }, cardShadow()]}>
          <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.inputBg }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={t.placeholder}
          />

          <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.inputBg }]}
            value={mobile}
            onChangeText={setMobile}
            placeholder="+91 XXXXXXXXXX"
            placeholderTextColor={t.placeholder}
            keyboardType="phone-pad"
          />

          <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.inputBg }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={t.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: t.textPrimary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { color: t.background }]}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
    lineHeight: 36,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  changePhotoText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
});

