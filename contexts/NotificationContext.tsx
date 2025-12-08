import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService } from '@/services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const notifications = await notificationService.getNotifications();
      const unreadNotifications = notifications.filter(n => n.read === false);
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    refreshUnreadCount();

    // Set up real-time subscription using the notification service
    let subscriptionPromise: Promise<any> | null = null;

    const setupSubscription = async () => {
      subscriptionPromise = notificationService.subscribeToNotifications(
        (notification, event) => {
          console.log('📬 Real-time notification update in context:', event, notification);
          
          // Refresh the unread count whenever notifications change
          refreshUnreadCount();
        }
      );

      const subscription = await subscriptionPromise;
      return subscription;
    };

    const subscription = setupSubscription();

    // Cleanup subscription on unmount or user change
    return () => {
      subscription.then(sub => {
        if (sub) {
          console.log('🔌 Unsubscribing from real-time notifications in context');
          sub.unsubscribe();
        }
      });
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
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
