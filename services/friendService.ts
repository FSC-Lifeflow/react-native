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
 * Blocked user data structure
 */
export type BlockedUser = {
  id: string;
  blocked_id: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
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

    // Check if the current user is blocked by the receiver
    const isBlocked = await this.isBlockedByUser(receiverId);
    if (isBlocked) {
      throw new Error('You cannot send a friend request to this user');
    }

    // Check if the current user has blocked the receiver
    const hasBlocked = await this.isUserBlocked(receiverId);
    if (hasBlocked) {
      throw new Error('You cannot send a friend request to a user you have blocked');
    }

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

  /**
   * Blocks a user, preventing them from sending friend requests
   */
  async blockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already blocked
    const { data: existingBlock, error: checkError } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking block status: ${checkError.message}`);
    }

    if (existingBlock) {
      throw new Error('User is already blocked');
    }

    // Create the block
    const { error } = await supabase
      .from('user_blocks')
      .insert([
        {
          blocker_id: user.id,
          blocked_id: userId,
        },
      ]);

    if (error) {
      throw new Error(`Failed to block user: ${error.message}`);
    }

    // Reject any pending friend requests from the blocked user
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
  },

  /**
   * Unblocks a user
   */
  async unblockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) {
      throw new Error(`Failed to unblock user: ${error.message}`);
    }
  },

  /**
   * Checks if a user is blocked by the current user
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  },

  /**
   * Gets a list of users blocked by the current user
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get blocked users: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get user details for each blocked user
      const blockedUserIds = data.map(block => block.blocked_id);
      const { data: blockedUsers, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .in('id', blockedUserIds);

      if (userError) {
        throw new Error(`Failed to fetch user details: ${userError.message}`);
      }

      // Combine the block data with user details
      return data.map(block => {
        const user = blockedUsers?.find(u => u.id === block.blocked_id) || {
          id: block.blocked_id,
          first_name: 'Unknown',
          last_name: 'User',
          username: 'unknown',
          email: 'No email',
          avatar_url: undefined
        };

        return {
          id: block.id,
          blocked_id: block.blocked_id,
          created_at: block.created_at,
          user
        };
      });
    } catch (error) {
      console.error('Error getting blocked users:', error);
      throw error;
    }
  },

  /**
   * Checks if the current user is blocked by another user
   */
  async isBlockedByUser(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', userId)
        .eq('blocked_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking if blocked by user:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if blocked by user:', error);
      return false;
    }
  },

  /**
   * Get all friends for a specific user (for viewing friend's profile)
   */
  async getFriendsOfUser(userId: string): Promise<Friend[]> {
    try {
      // Get all accepted friend requests where the specified user is either sender or receiver
      const { data: friendRequests, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
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
        request.sender_id === userId ? request.receiver_id : request.sender_id
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
    } catch (error) {
      console.error('Get friends of user error:', error);
      throw error;
    }
  },
};
