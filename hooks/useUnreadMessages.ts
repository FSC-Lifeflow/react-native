import { useState, useEffect } from 'react';
import { messageService } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track total unread message count across all chat rooms
 */
export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const chatRooms = await messageService.getUserChatRooms();
      const total = chatRooms.reduce((sum, room) => sum + room.unread_count, 0);
      setUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread message count:', error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to chat room updates to refresh unread count
    const subscription = messageService.subscribeToChatRooms(() => {
      loadUnreadCount();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    unreadCount,
    isLoading,
    refresh: loadUnreadCount,
  };
}
