import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  recipient_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  addNotification: (type: string, message: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { isAuthenticated } = useAuth();

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      if (Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }
  };

  const addNotification = async (type: string, message: string) => {
    if (!isAuthenticated) return;
    try {
      const response = await api.post('/notifications', { type, message });
      if (response.data) {
        setNotifications(prev => [response.data, ...prev]);
      }
    } catch (error) {
      console.warn('Failed to post notification:', error);
      // Fallback local append so it updates instantly
      const fallbackItem: NotificationItem = {
        id: Math.random().toString(),
        type,
        message,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [fallbackItem, ...prev]);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/read/${id}`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.warn('Failed to mark notification read:', error);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.warn('Failed to mark all notifications read:', error);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Periodically poll for new alerts every 10 seconds for premium live behavior
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      fetchNotifications,
      addNotification,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
