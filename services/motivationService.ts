import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { friendService, Friend } from './friendService';

/**
 * Motivation Service
 * Handles sending and requesting motivation from friends
 */
export const motivationService = {
  /**
   * Send motivation to selected friends
   * @param friendIds - Array of friend user IDs to send motivation to
   * @param message - The motivational message
   */
  async sendMotivation(friendIds: string[], message: string): Promise<void> {
    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get current user's profile info
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create notifications for all selected friends
      const notificationPromises = friendIds.map(friendId =>
        notificationService.createNotification({
          user_id: friendId,
          type: 'motivation_received',
          title: 'You received motivation!',
          message: `${userProfile.first_name} ${userProfile.last_name} sent you motivation!`,
          data: {
            sender_id: currentUser.id,
            sender_name: `${userProfile.first_name} ${userProfile.last_name}`,
            sender_username: userProfile.username,
            motivation_message: message
          },
          read: false
        }).catch(err => {
          console.warn(`⚠️ Could not create notification for friend ${friendId}:`, err);
          return null;
        })
      );
      
      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('❌ Error sending motivation:', error);
      throw error;
    }
  },

  /**
   * Request motivation from all friends
   */
  async requestMotivation(): Promise<number> {
    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get current user's profile info
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get all friends
      const friendsList = await friendService.getFriends();
      
      if (friendsList.length === 0) {
        throw new Error('You don\'t have any friends to request motivation from yet.');
      }

      // Create notifications for all friends
      const notificationPromises = friendsList.map(friend =>
        notificationService.createNotification({
          user_id: friend.id,
          type: 'motivation_request',
          title: 'Motivation Request',
          message: `${userProfile.first_name} ${userProfile.last_name} is requesting motivation!`,
          data: {
            requester_id: currentUser.id,
            requester_name: `${userProfile.first_name} ${userProfile.last_name}`,
            requester_username: userProfile.username
          },
          read: false
        }).catch(err => {
          console.warn(`⚠️ Could not create notification for ${friend.first_name}:`, err);
          return null;
        })
      );
      
      await Promise.all(notificationPromises);
      
      return friendsList.length;
    } catch (error) {
      console.error('❌ Error requesting motivation:', error);
      throw error;
    }
  }
};
