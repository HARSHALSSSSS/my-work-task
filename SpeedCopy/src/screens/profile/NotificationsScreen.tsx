import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Package, Truck, Tag, Bell } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import * as notificationsApi from '../../api/notifications';
import { useSocketEvent } from '../../hooks/useSocket';

const TABS = ['All', 'Delivery', 'Orders', 'Offers', 'Wallet'] as const;
type Tab = (typeof TABS)[number];

type BadgeType = 'Push' | 'WhatsApp';

interface NotifItem {
  id: string;
  title: string;
  message: string;
  time: string;
  iconType: 'delivered' | 'dispatched' | 'promo';
  badge: BadgeType;
  tabs: Tab[];
}

const ICON_CFG = {
  delivered: { icon: Package, bg: 'rgba(39, 174, 96, 0.2)', color: '#27AE60' },
  dispatched: { icon: Truck, bg: 'rgba(242, 153, 74, 0.2)', color: '#F2994A' },
  promo: { icon: Tag, bg: 'rgba(235, 87, 87, 0.1)', color: '#EB5757' },
};

const BADGE_CFG: Record<BadgeType, { bg: string; color: string }> = {
  Push: { bg: '#F0F0F0', color: '#6B6B6B' },
  WhatsApp: { bg: 'rgba(39, 174, 96, 0.15)', color: '#27AE60' },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
}

function mapBackendToUi(n: any): NotifItem {
  return {
    id: n._id,
    title: n.title,
    message: n.message,
    time: formatTimeAgo(n.createdAt),
    iconType: n.category === 'orders' ? 'delivered' as const : n.category === 'promotions' ? 'promo' as const : 'dispatched' as const,
    badge: (n.type === 'sms' ? 'WhatsApp' : 'Push') as BadgeType,
    tabs: ['All' as Tab, ...(n.category === 'orders' ? ['Orders' as Tab, 'Delivery' as Tab] : n.category === 'promotions' ? ['Offers' as Tab] : n.category === 'rewards' ? ['Wallet' as Tab] : [])],
  };
}

export const NotificationsScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [loading, setLoading] = useState(true);

  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  // Listen for real-time notification events
  useSocketEvent('notification:new', (data) => {
    if (data?.notification) {
      addNotification(data.notification);
    }
  });

  useEffect(() => {
    Promise.all([
      notificationsApi.getNotifications({ limit: 30 }).catch(() => null),
      notificationsApi.getNotificationSummary().catch(() => null),
    ])
      .then(([listResp, summaryResp]) => {
        const remoteNotifications = listResp?.notifications || [];
        if (remoteNotifications.length) {
          setNotifications(remoteNotifications);
        }
        if (typeof summaryResp?.unread_count === 'number') {
          setUnreadCount(summaryResp.unread_count);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setNotifications, setUnreadCount, addNotification]);

  const handleMarkAllRead = () => {
    notificationsApi.markAllRead().catch(() => {});
    markAllAsRead();
  };

  const notifs = notifications.map(mapBackendToUi);
  const filtered = notifs.filter((n) => n.tabs.includes(activeTab));

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Notifications</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={handleMarkAllRead}>
          <Text style={styles.markRead}>mark all as read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                { borderColor: t.border, backgroundColor: t.card },
                isActive && [styles.tabActive, { backgroundColor: t.textPrimary, borderColor: t.textPrimary }],
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: t.textPrimary }, isActive && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={t.textPrimary} style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bell size={40} color={t.textSecondary} />
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No notifications yet</Text>
          </View>
        ) : null}
        {filtered.map((item) => {
          const cfg = ICON_CFG[item.iconType];
          const bdg =
            item.badge === 'Push'
              ? { bg: t.chipBg, color: t.textSecondary }
              : BADGE_CFG[item.badge];
          const Icon = cfg.icon;
          return (
            <View key={item.id} style={[styles.notifCard, { backgroundColor: t.card }]}>
              <View style={[styles.notifIconWrap, { backgroundColor: cfg.bg }]}>
                <Icon size={20} color={cfg.color} />
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, { color: t.textPrimary }]}>{item.title}</Text>
                  <View style={[styles.notifBadge, { backgroundColor: bdg.bg }]}>
                    <Text style={[styles.notifBadgeText, { color: bdg.color }]}>{item.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.notifMsg, { color: t.textSecondary }]} numberOfLines={3}>{item.message}</Text>
                <Text style={[styles.notifTime, { color: t.placeholder }]}>{item.time}</Text>
              </View>
            </View>
          );
        })}
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
  },
  markRead: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#2F80ED',
    textDecorationLine: 'underline',
  },
  tabsScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000000',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
    gap: 4,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
  },
  notifBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 8,
  },
  notifBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
  },
  notifMsg: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 18,
  },
  notifTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#A5A5A5',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
});

