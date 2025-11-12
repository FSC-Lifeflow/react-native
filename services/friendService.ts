import { supabase } from '../lib/supabase';

/**
 * Friend request status types
 */
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Friend (from accepted friend request)
 */
export type Friend = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
};

/**
 * Friend request with user details
 */
export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
};

/**
 * User search result
 */
export type UserSearchResult = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
};

/**
 * Friend Service
 * Handles all friend-related operations
 */
export const friendService = {
  /**
   * Get all friends for the current user (accepted friend requests)
   */
  async getFriends(): Promise<Friend[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all accepted friend requests where current user is either sender or receiver
    const { data: friendRequests, error } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Failed to get friend requests:', error);
      throw new Error('Failed to get friends');
    }

    if (!friendRequests || friendRequests.length === 0) {
      return [];
    }

    // Extract friend IDs (the other person in each relationship)
    const friendIds = friendRequests.map(request => 
      request.sender_id === user.id ? request.receiver_id : request.sender_id
    );

    // Get user information for all friends
    const { data: friends, error: friendsError } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email, avatar_url, created_at')
      .in('id', friendIds);

    if (friendsError) {
      console.error('Failed to get friends info:', friendsError);
      throw new Error('Failed to get friends information');
    }

    return friends || [];
  },

  /**
   * Get pending friend requests received by the current user
   */
  async getReceivedRequests(): Promise<FriendRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:users!sender_id(id, first_name, last_name, username, email, avatar_url),
        receiver:users!receiver_id(id, first_name, last_name, username, email, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get pending friend requests sent by the current user
   */
  async getSentRequests(): Promise<FriendRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:users!sender_id(id, first_name, last_name, username, email, avatar_url),
        receiver:users!receiver_id(id, first_name, last_name, username, email, avatar_url)
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Search for users by username or name
   */
  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    const { data, error } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email, avatar_url, created_at')
      .or(`username.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
      .neq('id', user.id) // Exclude current user
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  /**
   * Send a friend request
   */
  async sendFriendRequest(receiverId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if request already exists
    const { data: existingRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);

    const existingRequest = existingRequests && existingRequests.length > 0 ? existingRequests[0] : null;

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new Error('Friend request already pending');
      }
      if (existingRequest.status === 'accepted') {
        throw new Error('You are already friends with this user');
      }
      // If rejected, update to pending
      if (existingRequest.status === 'rejected') {
        const { error } = await supabase
          .from('friend_requests')
          .update({ 
            status: 'pending',
            sender_id: user.id,
            receiver_id: receiverId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRequest.id);

        if (error) throw error;
        return;
      }
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      });

    if (error) throw error;
  },

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Unfriend a user by updating the friend request status to rejected
   */
  async unfriend(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Find the friend request to update
    const { data: friendRequest, error: findError } = await supabase
      .from('friend_requests')
      .select('id')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId},status.eq.accepted),` +
        `and(sender_id.eq.${friendId},receiver_id.eq.${user.id},status.eq.accepted)`
      )
      .maybeSingle();

    if (findError) throw new Error('Failed to find friend relationship');
    if (!friendRequest) throw new Error('No active friendship found');

    // Update the status to 'rejected'
    const { error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', friendRequest.id);

    if (error) throw error;
  },

  /**
   * Check friendship status with a user
   */
  async getFriendshipStatus(userId: string): Promise<FriendRequestStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('friend_requests')
      .select('status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .maybeSingle();

    if (error) {
      console.error('Failed to get friendship status:', error);
      return null;
    }

    return data?.status || null;
  },

  /**
   * Get friend count for the current user
   */
  async getFriendCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get pending request count for the current user
   */
  async getPendingRequestCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  },
};
