import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface BackendNotification {
  _id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  category: 'orders' | 'rewards' | 'system' | 'support' | 'account' | 'promotions';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationSummary {
  unread_count: number;
  category_counts: Record<string, number>;
  recent_notifications: BackendNotification[];
}

export interface BackendTicket {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  replies: { authorId: string; authorRole: string; message: string; createdAt: string }[];
  createdAt: string;
  updatedAt?: string;
}

export async function getNotifications(params?: { isRead?: string; category?: string; page?: number; limit?: number }) {
  const { data } = await api.get<Res<{ notifications: BackendNotification[]; meta: any }>>('/api/notifications', { params });
  return data.data;
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const { data } = await api.get<Res<NotificationSummary>>('/api/notifications/summary');
  return data.data;
}

export async function markAllRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function createTicket(body: {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  orderId?: string;
}): Promise<BackendTicket> {
  const { data } = await api.post<Res<BackendTicket>>('/api/notifications/tickets', body);
  return data.data;
}

export async function getTickets(params?: { status?: string; page?: number; limit?: number }) {
  const { data } = await api.get<Res<{ tickets: BackendTicket[]; meta: any }>>('/api/notifications/tickets', { params });
  return data.data;
}

export async function getTicket(id: string): Promise<BackendTicket> {
  const { data } = await api.get<Res<BackendTicket>>(`/api/notifications/tickets/${id}`);
  return data.data;
}

export async function replyToTicket(id: string, message: string): Promise<BackendTicket> {
  const { data } = await api.post<Res<BackendTicket>>(`/api/notifications/tickets/${id}/reply`, { message });
  return data.data;
}

export async function getHelpCenter() {
  const { data } = await api.get<Res<any>>('/api/notifications/help-center');
  return data.data;
}
