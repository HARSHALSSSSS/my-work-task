import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Copy, Link, MessageCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Colors } from '../../constants/theme';
import { FLOATING_TAB_CLEARANCE } from '../../navigation/AppNavigator';
import * as financeApi from '../../api/finance';
import { AppTabParamList, ProfileStackParamList } from '../../navigation/types';

type ReferNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ReferEarn'>;
type ReferRouteProp = RouteProp<ProfileStackParamList, 'ReferEarn'>;

export const ReferEarnScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<ReferNavigationProp>();
  const route = useRoute<ReferRouteProp>();
  const { referralCode: localCode } = useAuthStore();
  const [referralCode, setReferralCode] = useState(localCode);
  const [rewardPerFriend, setRewardPerFriend] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [friendsJoined, setFriendsJoined] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financeApi.getReferralSummary()
      .then((summary) => {
        const myCode = summary?.my_code || (summary as any)?.myCode || '';
        const reward = summary?.reward_per_friend ?? (summary as any)?.rewardPerFriend ?? 0;
        const totals = summary?.totals || (summary as any)?.totals || {};

        if (myCode) setReferralCode(myCode);
        if (reward) setRewardPerFriend(reward);
        if (totals) {
          setTotalReferrals(totals.total_referrals ?? totals.totalReferrals ?? 0);
          setFriendsJoined(totals.friends_joined ?? totals.friendsJoined ?? 0);
          setTotalEarned(totals.total_earned ?? totals.totalEarned ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const onInvite = async () => {
    try {
      await Share.share({
        message: `Hey! Use my referral code ${referralCode} on SpeedCopy and we both get Rs ${rewardPerFriend || 100}! Download now.`,
      });
    } catch {}
  };

  const handleBack = () => {
    if (route.params?.from === 'home') {
      const tabNavigation = navigation.getParent<BottomTabNavigationProp<AppTabParamList>>();
      tabNavigation?.navigate('HomeTab', { screen: 'CategoryHub' });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const tabNavigation = navigation.getParent<BottomTabNavigationProp<AppTabParamList>>();
    tabNavigation?.navigate('ProfileTab', { screen: 'Profile' });
  };

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Refer & earn</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.screenBody}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionStack}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>{`Invite friends and\nearn Rs ${rewardPerFriend || 100}`}</Text>
            <Text style={[styles.heroSubtitle, { color: t.textSecondary }]}>
              Share your code with friends. Once they place their first order, you both get rewards
            </Text>
          </View>

          <View style={styles.codeBox}>
            <Text style={[styles.codeLabel, { color: t.textSecondary }]}>YOUR REFERRAL CODE</Text>
            <View style={[styles.codeRow, { backgroundColor: t.card }]}>
              <Text style={[styles.codeText, { color: t.textPrimary }]} numberOfLines={1}>
                {referralCode}
              </Text>
              <TouchableOpacity style={[styles.copyBtn, { backgroundColor: t.textPrimary }]} onPress={copyCode} activeOpacity={0.8}>
                <Copy size={16} color={Colors.surface} />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shareSection}>
            <Text style={[styles.shareTitle, { color: t.textPrimary }]}>Share Via</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity style={styles.shareItem} onPress={onInvite}>
                <View style={[styles.shareIconWrap, { backgroundColor: '#25D366' }]}>
                  <MessageCircle size={20} color={Colors.surface} />
                </View>
                <Text style={[styles.shareLabel, { color: t.textPrimary }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareItem} onPress={copyCode}>
                <View style={[styles.shareIconWrap, { backgroundColor: t.textPrimary }]}>
                  <Link size={20} color={Colors.surface} />
                </View>
                <Text style={[styles.shareLabel, { color: t.textPrimary }]}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statusCard, { backgroundColor: t.card }]}>
            <Text style={[styles.statusTitle, { color: t.textPrimary }]}>Referral Status</Text>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.purplePrimary} style={styles.loader} />
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: t.textPrimary }]}>{totalReferrals}</Text>
                  <Text style={[styles.statLabel, { color: t.textSecondary }]}>Invited</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: t.textPrimary }]}>{friendsJoined}</Text>
                  <Text style={[styles.statLabel, { color: t.textSecondary }]}>Joined</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: Colors.purplePrimary }]}>{`Rs ${totalEarned}`}</Text>
                  <Text style={[styles.statLabel, { color: t.textSecondary }]}>Earned</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Conditions Apply</Text>
            <Text style={[styles.termsBody, { color: t.textSecondary }]}>
              Rewards will be credited within 24 hours of friend's first successful purchase
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button title="Invite Now" onPress={onInvite} />
        </View>
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  screenBody: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  sectionStack: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  heroSection: {
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
    lineHeight: 26,
    color: Colors.purplePrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  codeBox: {
    borderWidth: 1.5,
    borderColor: Colors.purpleBorder,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: Colors.purpleLightBg,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    letterSpacing: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 14,
    alignSelf: 'stretch',
  },
  codeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  copyBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.surface,
  },
  shareSection: {
    alignItems: 'center',
    gap: 8,
  },
  shareTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 22,
  },
  shareItem: {
    alignItems: 'center',
    gap: 5,
  },
  shareIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  statusCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  statusTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },
  loader: {
    paddingVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  termsSection: {
    alignItems: 'center',
    gap: 4,
  },
  termsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.blueAccent,
    textDecorationLine: 'underline',
  },
  termsBody: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: FLOATING_TAB_CLEARANCE + 20,
  },
});
