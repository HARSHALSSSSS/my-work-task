import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Wallet, AlertCircle, Gift, ShoppingBag, RefreshCw, Coins } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { WalletStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<WalletStackParamList, 'Wallet'>;

interface Txn {
  id: string;
  label: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  icon: React.ElementType;
}

function txnIcon(description: string, type: 'credit' | 'debit'): React.ElementType {
  const d = description.toLowerCase();
  if (d.includes('referral')) return Gift;
  if (d.includes('refund')) return RefreshCw;
  if (d.includes('welcome') || d.includes('bonus') || d.includes('reward')) return Coins;
  return type === 'credit' ? Gift : ShoppingBag;
}

export const WalletScreen: React.FC = () => {
  const { colors: t, mode } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const { walletBalance, walletTransactions, fetchWallet } = useOrderStore();
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchWallet().finally(() => setLoading(false));
  }, [fetchWallet]));

  const txns: Txn[] = walletTransactions.map((wt) => ({
    id: wt.id,
    label: wt.description,
    date: new Date(wt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    amount: wt.amount,
    type: wt.type,
    icon: txnIcon(wt.description, wt.type),
  }));

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Wallet Overview</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#56CCF2', '#2F80ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.walletIconBox}>
            <Wallet size={20} color="#FFFFFF" />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.walletLabel}>SpeedCopy Wallet</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>₹{walletBalance || 0}</Text>
              <Text style={styles.balanceSub}>Available Balance</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: t.textPrimary }]}
            onPress={() => navigation.navigate('AddFunds')}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, { color: t.background }]}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: t.border, backgroundColor: t.card }]}
            onPress={() => navigation.navigate('WalletLedger')}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnOutlineText, { color: t.textPrimary }]}>View Full Ledger</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.infoBar,
            {
              backgroundColor: mode === 'dark' ? 'rgba(47, 128, 237, 0.16)' : 'rgba(47, 128, 237, 0.2)',
              borderColor: mode === 'dark' ? 'rgba(86, 167, 255, 0.4)' : '#2F80ED',
            },
          ]}
        >
          <AlertCircle size={24} color={mode === 'dark' ? '#86C5FF' : '#2F80ED'} />
          <Text style={[styles.infoText, { color: t.textPrimary }]}>
            Use your wallet balance on your next order for instant discount at checkout.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recent Transactions</Text>

        {loading ? (
          <ActivityIndicator size="small" color={t.textPrimary} style={{ marginTop: 20 }} />
        ) : txns.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txnList}>
            {txns.map((txn) => {
              const isCredit = txn.type === 'credit';
              const Icon = txn.icon;
              return (
                <View key={txn.id} style={[styles.txnRow, { backgroundColor: t.card, borderColor: t.border }]}>
                  <View style={styles.txnLeft}>
                    <View style={[styles.txnIconBox, { backgroundColor: isCredit ? 'rgba(0, 195, 73, 0.2)' : 'rgba(235, 87, 87, 0.2)' }]}>
                      <Icon size={18} color={isCredit ? '#00C349' : '#EB5757'} />
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnLabel, { color: t.textPrimary }]}>{txn.label}</Text>
                      <Text style={[styles.txnDate, { color: t.textSecondary }]}>{txn.date}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txnAmount, { color: isCredit ? '#00C349' : '#EB5757' }]}>
                    {isCredit ? '+' : '-'}₹{txn.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
    fontSize: 21,
    lineHeight: 36,
    color: '#242424',
    textAlign: 'center',
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  balanceCard: {
    flexDirection: 'row',
    gap: 13,
    padding: 10,
    borderRadius: 15,
    height: 103,
    alignItems: 'center',
    marginBottom: 10,
  },
  walletIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: {
    gap: 9,
  },
  walletLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 21,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  balanceRow: {
    gap: 5,
  },
  balanceAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 25,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  balanceSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  infoBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderWidth: 0.5,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  actionBtnOutline: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  infoText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
    lineHeight: 24,
    color: '#000000',
    marginBottom: 20,
  },
  txnList: {
    gap: 10,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  txnLeft: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  txnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnInfo: {
    width: 117,
  },
  txnLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    color: '#000000',
  },
  txnDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#6B6B6B',
  },
  txnAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 23,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
  },
});

