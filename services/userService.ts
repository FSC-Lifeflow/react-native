import { supabase } from '@/lib/supabase';

/**
 * Type definition for user search results
 */
export type SearchUser = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  mutual_friends_count?: number;
};

/**
 * Type for friend's public profile data
 */
export type FriendProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  fitness_level?: string;
  primary_goals?: string;
  exercise_preferences?: string;
  activity_sharing?: boolean;
  created_at: string;
  avatar_url?: string;
};

/**
 * User Service
 * Handles user-related functionality including search and profile operations
 */
export const userService = {
  /**
   * Searches for users by username, first name, or last name
   * Only returns users who have social_privacy enabled (true)
   * @param query - Search query string
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of matching users
   */
  async searchUsers(query: string, limit: number = 10): Promise<SearchUser[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // Get current user to exclude from search results
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const searchTerm = `%${query.trim()}%`;
      
      // Search across username, first_name, and last_name fields
      // Only include users who have social_privacy enabled (true or null, since null defaults to true)
      let queryBuilder = supabase
        .from('users')
        .select('id, username, first_name, last_name, email, avatar_url, created_at')
        .or(`username.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .or('social_privacy.is.null,social_privacy.eq.true')
        .limit(limit);

      // Exclude current user from results if logged in
      if (currentUser?.id) {
        queryBuilder = queryBuilder.neq('id', currentUser.id);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Failed to search users:', error);
        throw new Error(`Failed to search users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('User search error:', error);
      throw error;
    }
  },

  /**
   * Gets a user by their ID
   * @param userId - User ID to fetch
   * @returns User data or null if not found
   */
  async getUserById(userId: string): Promise<SearchUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, email, avatar_url, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch user by ID:', error);
        throw new Error('Failed to fetch user');
      }

      return data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  },

  /**
   * Gets multiple users by their IDs
   * @param userIds - Array of user IDs to fetch
   * @returns Array of user data
   */
  async getUsersByIds(userIds: string[]): Promise<SearchUser[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, email, avatar_url, created_at')
        .in('id', userIds);

      if (error) {
        console.error('Failed to fetch users by IDs:', error);
        throw new Error('Failed to fetch users');
      }

      return data || [];
    } catch (error) {
      console.error('Get users by IDs error:', error);
      throw error;
    }
  },

  /**
   * Gets a friend's public profile information
   * Only returns public information
   * @param friendId - ID of the friend whose profile to fetch
   * @returns Friend's public profile data
   */
  async getFriendProfile(friendId: string): Promise<FriendProfileData | null> {
    try {
      // Try to fetch with activity_sharing first
      let { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, email, avatar_url, fitness_level, primary_goals, exercise_preferences, activity_sharing, created_at')
        .eq('id', friendId)
        .maybeSingle();

      // If column doesn't exist yet (error code 42703), fetch without it and default to true
      if (error && error.code === '42703') {
        console.warn('activity_sharing column not found, fetching without it (defaulting to true)');
        const fallbackResult = await supabase
          .from('users')
          .select('id, username, first_name, last_name, email, avatar_url, fitness_level, primary_goals, exercise_preferences, created_at')
          .eq('id', friendId)
          .maybeSingle();
        
        if (fallbackResult.error) {
          console.error('Failed to fetch friend profile:', fallbackResult.error);
          throw new Error('Failed to fetch friend profile');
        }
        
        // Return data with activity_sharing defaulted to true
        return fallbackResult.data ? { ...fallbackResult.data, activity_sharing: true } : null;
      }

      if (error) {
        console.error('Failed to fetch friend profile:', error);
        throw new Error('Failed to fetch friend profile');
      }

      // Default activity_sharing to true if null/undefined
      return data ? { ...data, activity_sharing: data.activity_sharing ?? true } : null;
    } catch (error) {
      console.error('Get friend profile error:', error);
      throw error;
    }
  }
};
