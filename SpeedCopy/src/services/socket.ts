import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { getToken } from '../api/client';
import { Platform } from 'react-native';

let socketInstance: Socket | null = null;

function resolveSocketUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_SOCKET_URL || '').trim();
  if (envUrl) return envUrl;

  const envApi = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (envApi) {
    try {
      const parsed = new URL(envApi);
      return parsed.origin;
    } catch {
      /* ignore */
    }
  }

  const debuggerHost =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost && typeof debuggerHost === 'string') {
    const ip = debuggerHost.split(':')[0]?.trim();
    if (ip) return `http://${ip}:4007`;
  }

  return Platform.OS === 'android' ? 'http://127.0.0.1:4007' : 'http://localhost:4007';
}

export const SOCKET_URL = resolveSocketUrl();

export interface NotificationEvent {
  notification: any;
}

export interface TicketReplyEvent {
  ticketId: string;
  reply: any;
}

export interface TicketStatusEvent {
  ticketId: string;
  status: string;
}

export interface OrderStatusEvent {
  orderId: string;
  status: string;
  note?: string;
}

export interface DeliveryLocationEvent {
  orderId: string;
  lat: number;
  lng: number;
  etaMinutes?: number;
  distanceKm?: number;
}

/**
 * Initialize and return the Socket.IO client.
 */
export async function initSocket(): Promise<Socket | null> {
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance && !socketInstance.connected) {
    socketInstance.connect();
    return socketInstance;
  }

  const token = await getToken();
  if (!token) return null;

  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socketInstance = socket;
  return socket;
}

/**
 * Get the current socket instance.
 */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Disconnect and cleanup.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }
}

/**
 * Refresh socket auth token after login.
 */
export async function refreshSocketAuth(): Promise<void> {
  const token = await getToken();
  if (socketInstance) {
    socketInstance.auth = { token };
    if (!socketInstance.connected) socketInstance.connect();
  }
}

/**
 * Subscribe to a socket event.
 */
export function onSocketEvent(
  event: string,
  callback: (data: any) => void
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on(event, callback);
  return () => {
    socket.off(event, callback);
  };
}

/**
 * Emit a socket event.
 */
export function emitSocketEvent(event: string, data?: any): void {
  const socket = getSocket();
  if (!socket) return;
  socket.emit(event, data);
}

/**
 * Join a ticket room for real-time chat.
 */
export function joinTicketRoom(ticketId: string): void {
  emitSocketEvent('ticket:join', { ticketId });
}

/**
 * Leave a ticket room.
 */
export function leaveTicketRoom(ticketId: string): void {
  emitSocketEvent('ticket:leave', { ticketId });
}
