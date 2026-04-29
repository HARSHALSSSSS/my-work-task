import api from './client';

export interface UserProfile {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  avatar: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    push?: boolean;
    whatsapp?: boolean;
    criticalAlerts?: boolean;
    quietHours?: { start: string; end: string };
  };
  privacyRequests?: {
    dataExportStatus?: string;
    accountDeletionStatus?: string;
  };
}

export interface UserAddress {
  _id: string;
  userId: string;
  label: 'Home' | 'Office' | 'Other';
  fullName: string;
  phone: string;
  houseNo?: string;
  area?: string;
  landmark?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  location?: { lat: number; lng: number };
}

type Res<T> = { success: boolean; data: T; message?: string };

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get<Res<UserProfile>>('/api/users/profile');
  return data.data;
}

export async function updateProfile(body: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar' | 'dateOfBirth' | 'gender'>>): Promise<UserProfile> {
  const { data } = await api.put<Res<UserProfile>>('/api/users/profile', body);
  return data.data;
}

export async function getAddresses(): Promise<UserAddress[]> {
  const { data } = await api.get<Res<UserAddress[]>>('/api/users/addresses');
  return data.data;
}

export async function addAddress(body: Omit<UserAddress, '_id' | 'userId' | 'country'>): Promise<UserAddress> {
  const { data } = await api.post<Res<UserAddress>>('/api/users/addresses', body);
  return data.data;
}

export async function updateAddress(id: string, body: Partial<UserAddress>): Promise<UserAddress> {
  const { data } = await api.put<Res<UserAddress>>(`/api/users/addresses/${id}`, body);
  return data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/api/users/addresses/${id}`);
}

// ─── Notification Preferences ───────────────────────
export interface NotificationPreferences {
  push: boolean;
  whatsapp: boolean;
  criticalAlerts?: boolean;
  quietHours?: { start: string; end: string };
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<UserProfile> {
  const { data } = await api.patch<Res<UserProfile>>('/api/users/profile/notifications', prefs);
  return data.data;
}

// ─── Account Management ─────────────────────────────
export async function requestDataExport(): Promise<void> {
  await api.post('/api/users/profile/data-export-request');
}

export async function requestAccountDeletion(reason?: string): Promise<{ accountDeletionStatus: string }> {
  const { data } = await api.post<Res<{ accountDeletionStatus: string }>>('/api/users/profile/account-deletion-request', { reason });
  return data.data;
}

// ─── Avatar Upload ──────────────────────────────────
export async function uploadAvatar(fileUri: string): Promise<{ avatar: string }> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('avatar', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const { data } = await api.post<Res<{ avatar: string }>>('/api/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
