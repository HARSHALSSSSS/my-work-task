import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, SlidersHorizontal, Wallet } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { WalletStackParamList } from '../../navigation/types';
import * as financeApi from '../../api/finance';

type Nav = NativeStackNavigationProp<WalletStackParamList, 'WalletLedger'>;
type FilterTab = 'all' | 'credits' | 'debits';
type LedgerGroup = { title: string; items: financeApi.LedgerEntry[] };

const FILTERS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'credits', label: 'Credits' },
  { id: 'debits', label: 'Debits' },
];

function formatLedgerTitle(entry: financeApi.LedgerEntry): string {
  if (entry.description?.trim()) return entry.description.trim();
  return entry.category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGroupTitle(ts: string): string {
  const date = new Date(ts);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const WalletLedgerScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const { userName } = useAuthStore();
  const navigation = useNavigation<Nav>();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [entries, setEntries] = useState<financeApi.LedgerEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);

      Promise.all([
        financeApi.getWalletOverview(),
        financeApi.getWalletLedger({ page: 1, limit: 100 }),
      ])
        .then(([overview, ledger]) => {
          if (cancelled) return;
          setWalletBalance(overview?.wallet?.balance || 0);
          setEntries(Array.isArray(ledger?.entries) ? ledger.entries : []);
        })
        .catch(() => {
          if (cancelled) return;
          setEntries([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => { cancelled = true; };
    }, []),
  );

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'credits') return entries.filter((entry) => entry.type === 'credit');
    if (activeFilter === 'debits') return entries.filter((entry) => entry.type === 'debit');
    return entries;
  }, [activeFilter, entries]);

  const groupedEntries = useMemo<LedgerGroup[]>(() => {
    const buckets = new Map<string, financeApi.LedgerEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = formatGroupTitle(entry.createdAt);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(entry);
    });
    return Array.from(buckets.entries()).map(([title, items]) => ({ title, items }));
  }, [filteredEntries]);

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Wallet Ledger</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#7CC6EA', '#8CB6E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View style={styles.walletIconWrap}>
              <Wallet size={16} color="#0F172A" />
            </View>
            <Text style={styles.walletTitle}>Speedcopy Wallet</Text>
          </View>
          <Text style={styles.walletAmount}>â‚¹{walletBalance}</Text>
          <Text style={styles.walletSub}>Available Balance</Text>

          <View style={styles.walletDivider} />

          <View style={styles.walletBottomRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountLabel}>Account Holder Name</Text>
              <Text style={styles.accountName}>{userName || 'SpeedCopy User'}</Text>
            </View>
            <TouchableOpacity
              style={styles.addFundsBtn}
              onPress={() => navigation.navigate('AddFunds')}
              activeOpacity={0.85}
            >
              <Text style={styles.addFundsText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  { borderColor: t.border, backgroundColor: t.card },
                  active && { backgroundColor: '#000000', borderColor: '#000000' },
                ]}
                onPress={() => setActiveFilter(f.id)}
              >
                <Text style={[styles.filterText, { color: t.textPrimary }, active && { color: '#FFFFFF' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.85}>
            <SlidersHorizontal size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color="#2F80ED" />
          </View>
        ) : groupedEntries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No transactions yet.</Text>
          </View>
        ) : (
          groupedEntries.map((group) => (
            <View key={group.title} style={styles.groupWrap}>
              <Text style={[styles.groupTitle, { color: t.textSecondary }]}>{group.title}</Text>
              {group.items.map((entry) => {
                const isCredit = entry.type === 'credit';
                return (
                  <View key={entry._id} style={[styles.txnCard, { backgroundColor: t.card }]}>
                    <View style={[styles.txnIconWrap, { backgroundColor: isCredit ? '#DCF7E5' : '#FCE1E1' }]}>
                      {isCredit ? (
                        <ArrowUpRight size={18} color="#00B85A" />
                      ) : (
                        <ArrowDownLeft size={18} color="#EB5757" />
                      )}
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnTitle, { color: t.textPrimary }]} numberOfLines={1}>
                        {formatLedgerTitle(entry)}
                      </Text>
                      <Text style={[styles.txnDate, { color: t.textSecondary }]}>
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {'  '}
                        {new Date(entry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: isCredit ? '#00B85A' : '#EB5757' }]}>
                      {isCredit ? '+' : '-'}â‚¹{entry.amount}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))
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
    fontSize: 30 / 2,
    lineHeight: 22,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  walletCard: {
    borderRadius: 14,
    padding: 12,
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  walletIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#67CEF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 32 / 2,
    color: '#0B172A',
  },
  walletAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 42 / 2,
    color: '#0B172A',
    marginTop: 2,
  },
  walletSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#1E4A6A',
    marginTop: 2,
  },
  walletDivider: {
    height: 1,
    backgroundColor: 'rgba(17, 57, 88, 0.32)',
    marginTop: 10,
    marginBottom: 8,
  },
  walletBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  accountLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#3A5A78',
  },
  accountName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#0B172A',
    marginTop: 1,
  },
  addFundsBtn: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addFundsText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  filterIconBtn: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    paddingTop: 18,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingTop: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  groupWrap: {
    marginTop: 10,
  },
  groupTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30 / 2,
    marginBottom: 8,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  txnIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txnInfo: {
    flex: 1,
  },
  txnTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  txnDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  txnAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
});

