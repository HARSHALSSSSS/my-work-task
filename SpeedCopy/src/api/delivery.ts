import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface DeliveryTracking {
  id?: string;
  orderId: string;
  customerId?: string;
  status: string;
  riderId?: string;
  activeAssignment?: any;
  pickup?: { name: string; address?: string; addressLine?: string; contacts?: string[]; location?: { lat: number; lng: number } };
  dropoff?: { name: string; address?: string; addressLine?: string; contacts?: string[]; location?: { lat: number; lng: number } };
  items?: any[];
  etaMinutes?: number;
  distanceKm?: number;
  route?: { polyline?: string; duration?: number; distance?: number };
  latestLocation?: { lat: number; lng: number; timestamp?: string };
  locationUpdates?: { lat: number; lng: number; timestamp: string }[];
  history?: { status: string; timestamp: string; note?: string }[];
  proofOfDelivery?: any;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function trackDelivery(orderId: string): Promise<DeliveryTracking> {
  const { data } = await api.get<Res<DeliveryTracking>>(`/api/delivery/track/${orderId}`);
  return data.data;
}
