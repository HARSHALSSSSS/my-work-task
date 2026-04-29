import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShoppingBag, Gift, Truck, CreditCard, Ticket } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { ProfileStackParamList } from '../../navigation/types';
import * as notificationsApi from '../../api/notifications';
import { useSocketEvent } from '../../hooks/useSocket';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Support'>;

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

const CATEGORIES = [
  { label: 'Orders', icon: ShoppingBag, bg: 'rgba(47, 128, 237, 0.15)', color: '#2F80ED' },
  { label: 'Gifting', icon: Gift, bg: 'rgba(242, 153, 74, 0.15)', color: '#F2994A' },
  { label: 'Delivery', icon: Truck, bg: 'rgba(39, 174, 96, 0.15)', color: '#27AE60' },
  { label: 'Payments', icon: CreditCard, bg: 'rgba(107, 107, 107, 0.15)', color: '#6B6B6B' },
];

interface TicketItem {
  id: string;
  ticketId: string;
  description: string;
  status: 'In Progress' | 'Resolved';
  lastUpdated: string;
}

const STATUS_CFG = {
  'In Progress': { bg: 'rgba(47, 128, 237, 0.15)', color: '#2F80ED' },
  Resolved: { bg: 'rgba(155, 81, 224, 0.15)', color: '#9B51E0' },
};


export const SupportScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for real-time ticket updates
  useSocketEvent('ticket:updated', (data: any) => {
    if (data?.ticketId) {
      setTickets((prev) =>
        prev.map((tk) =>
          tk.id === data.ticketId
            ? {
                ...tk,
                status: data.status === 'resolved' || data.status === 'closed' ? 'Resolved' : 'In Progress',
                lastUpdated: 'Updated just now',
              }
            : tk
        )
      );
    }
  });

  // Listen for new ticket replies
  useSocketEvent('ticket:reply', (data: any) => {
    if (data?.ticketId) {
      setTickets((prev) =>
        prev.map((tk) =>
          tk.id === data.ticketId
            ? { ...tk, lastUpdated: 'Updated just now' }
            : tk
        )
      );
    }
  });

  useEffect(() => {
    notificationsApi.getTickets({ limit: 10 })
      .then(({ tickets: tks }) => {
        if (tks?.length) {
          setTickets(tks.map((tk) => ({
            id: tk._id,
            ticketId: `Ticket #${tk._id.slice(-4)}`,
            description: tk.subject,
            status: tk.status === 'resolved' || tk.status === 'closed' ? 'Resolved' as const : 'In Progress' as const,
            lastUpdated: `Updated ${formatTimeAgo(tk.updatedAt || tk.createdAt)}`,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: t.textPrimary }]}>How can we help you today?</Text>

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <TouchableOpacity key={cat.label} style={[styles.categoryCard, { backgroundColor: t.card }]} activeOpacity={0.8}>
                <View style={[styles.catIconBox, { backgroundColor: cat.bg }]}>
                  <Icon size={22} color={cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: t.textPrimary }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <LinearGradient
          colors={['#7B5EA7', '#5B3D8F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ticketBanner}
        >
          <Text style={styles.bannerTitle}>Can't find an answer?</Text>
          <Text style={styles.bannerSub}>Our support team is here to help with any questions</Text>
          <TouchableOpacity
            style={styles.raiseBtn}
            onPress={() => navigation.navigate('RaiseTicket')}
            activeOpacity={0.8}
          >
            <Ticket size={14} color="#FFFFFF" />
            <Text style={styles.raiseBtnText}>Raise a Ticket</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.ticketHeader}>
          <Text style={[styles.ticketTitle, { color: t.textPrimary }]}>Recent Tickets</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ticketList}>
          {loading ? (
            <ActivityIndicator size="small" color={t.textPrimary} style={{ marginTop: 10 }} />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: t.textSecondary }]}>No tickets yet. We're here when you need us!</Text>
            </View>
          ) : null}
          {tickets.map((ticket) => {
            const s = STATUS_CFG[ticket.status];
            return (
              <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: t.card }]}>
                <View style={styles.ticketTop}>
                  <Text style={[styles.ticketId, { color: t.textSecondary }]}>{ticket.ticketId}</Text>
                  <View style={[styles.ticketBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.ticketBadgeText, { color: s.color }]}>{ticket.status}</Text>
                  </View>
                </View>
                <Text style={[styles.ticketDesc, { color: t.textPrimary }]}>{ticket.description}</Text>
                <Text style={[styles.ticketUpdated, { color: t.placeholder }]}>{ticket.lastUpdated}</Text>
              </View>
            );
          })}
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
    gap: 18,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 23,
    lineHeight: 30,
    color: '#000000',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: '#000000',
  },
  ticketBanner: {
    borderRadius: 15,
    padding: 16,
    gap: 8,
  },
  bannerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 19,
    color: '#FFFFFF',
  },
  bannerSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  raiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  raiseBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
    lineHeight: 24,
    color: '#000000',
  },
  viewAllLink: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#2F80ED',
  },
  ticketList: {
    gap: 10,
  },
  ticketCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#6B6B6B',
  },
  ticketBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
  },
  ticketBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  ticketDesc: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: '#000000',
  },
  ticketUpdated: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#A5A5A5',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
});

