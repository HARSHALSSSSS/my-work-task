import { useEffect, useRef } from 'react';
import { initSocket, disconnectSocket, onSocketEvent } from '../services/socket';
import { useSocketStore } from '../store/useSocketStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';

export function useSocketInit() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSocket = useSocketStore((s) => s.setSocket);
  const setConnected = useSocketStore((s) => s.setConnected);
  const setConnectionError = useSocketStore((s) => s.setConnectionError);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const initRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (initRef.current) {
        disconnectSocket();
        initRef.current = false;
      }
      setSocket(null);
      setConnected(false);
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    let unsubscribers: Array<() => void> = [];

    async function connect() {
      try {
        const socket = await initSocket();
        if (!socket) return;

        setSocket(socket);

        socket.on('connect', () => {
          setConnected(true);
          setConnectionError(null);
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });

        socket.on('connect_error', (err) => {
          setConnectionError(err.message);
        });

        unsubscribers.push(
          onSocketEvent('notification:new', (data) => {
            if (data?.notification) {
              addNotification(data.notification);
            }
          })
        );

        unsubscribers.push(
          onSocketEvent('notification:read', (data) => {
            if (data?.notificationId) {
              markAsRead(data.notificationId);
            }
          })
        );

        unsubscribers.push(
          onSocketEvent('notification:allRead', () => {
            markAllAsRead();
          })
        );
      } catch {
        // Silent fail - app continues working with APIs
      }
    }

    connect();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isAuthenticated, setSocket, setConnected, setConnectionError]);
}

export function useSocketEvent(event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return onSocketEvent(event, (data: any) => {
      callbackRef.current(data);
    });
  }, [event]);
}

