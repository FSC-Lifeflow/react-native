import { supabase } from '../lib/supabase';

/**
 * Notification data structure
 */
export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Notification Service
 * Handles notification functionality
 */
export const notificationService = {
  /**
   * Gets all notifications for the current user
   * @returns Array of notifications
   */
  async getNotifications(): Promise<Notification[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to get notifications:', error);
        throw new Error('Failed to get notifications');
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  },

  /**
   * Marks a notification as read
   * @param notificationId - ID of the notification to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to mark notification as read:', error);
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('❌ Mark notification as read error:', error);
      throw error;
    }
  },

  /**
   * Marks all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('❌ Failed to mark all notifications as read:', error);
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark all notifications as read error:', error);
      throw error;
    }
  },

  /**
   * Deletes a notification
   * @param notificationId - ID of the notification to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to delete notification:', error);
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  },

  /**
   * Creates a new notification
   * @param notification - Notification data to create
   */
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    try {
      // Use the database function to bypass RLS policies
      // This allows users to create notifications for other users (e.g., friend invitations, motivation)
      const { data, error } = await supabase
        .rpc('create_notification_for_user', {
          p_user_id: notification.user_id,
          p_type: notification.type,
          p_title: notification.title,
          p_message: notification.message,
          p_data: notification.data || null,
          p_read: notification.read || false
        });

      if (error) {
        console.error('❌ Failed to create notification:', error);
        throw new Error('Failed to create notification');
      }

      // RPC returns an array, get the first item
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('❌ Create notification error:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time notification changes for the current user
   * @param callback - Function to call when notifications change
   * @returns Supabase subscription object
   */
  subscribeToNotifications(
    callback: (notification: Notification, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
  ) {
    return (async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          console.error('❌ No authenticated user for notification subscription');
          return null;
        }

        console.log('🔔 Subscribing to notifications for user:', currentUser.id);
        
        const subscription = supabase
          .channel(`notifications:${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
              console.log('📨 New notification received (INSERT):', payload);
              callback(payload.new as Notification, 'INSERT');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
              console.log('✏️ Notification updated (UPDATE):', payload);
              callback(payload.new as Notification, 'UPDATE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
              console.log('🗑️ Notification deleted (DELETE):', payload);
              callback(payload.old as Notification, 'DELETE');
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to notifications channel');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Notification channel error:', err);
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ Notification subscription timed out');
            } else if (status === 'CLOSED') {
              console.log('🔒 Notification channel closed');
            } else {
              console.log('📡 Notification subscription status:', status);
            }
          });

        return subscription;
      } catch (error) {
        console.error('❌ Error setting up notification subscription:', error);
        return null;
      }
    })();
  }
};
