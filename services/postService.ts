import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

/**
 * User post data structure
 */
export type UserPost = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username?: string;
    email?: string;
    avatar_url?: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked_by_user?: boolean;
};

/**
 * Post Service
 * Handles all post-related functionality for React Native
 */
export const postService = {
  /**
   * Gets posts from the current user's friends (friend activity feed)
   */
  async getFriendPosts(limit: number = 20): Promise<UserPost[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      // Get all accepted friend IDs
      const { data: friendRequests, error: friendError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (friendError) {
        console.error('Failed to get friend requests:', friendError);
        throw new Error('Failed to get friends');
      }

      // Extract friend IDs (or empty array if no friends)
      const friendIds = friendRequests?.map(request => 
        request.sender_id === currentUser.id ? request.receiver_id : request.sender_id
      ) || [];

      // Include current user's ID to show their own posts too
      const userIdsToShow = [...friendIds, currentUser.id];

      // Calculate date 7 days ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoISO = oneWeekAgo.toISOString();

      // Get posts from friends AND current user
      const { data: posts, error: postsError } = await supabase
        .from('user_posts')
        .select('*')
        .in('user_id', userIdsToShow)
        .gte('created_at', oneWeekAgoISO)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postsError) {
        console.error('Failed to get friend posts:', postsError);
        throw new Error('Failed to get friend posts');
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      // Get user info for all posts
      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .in('id', userIds);

      if (usersError) {
        console.error('Failed to fetch user info:', usersError);
      }

      // Get likes and comments counts for all posts
      const postIds = posts.map(p => p.id);
      
      // Get likes data
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Get comments with their IDs
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .in('post_id', postIds);

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: repliesData } = commentIds.length > 0 
        ? await supabase
            .from('comment_replies')
            .select('comment_id')
            .in('comment_id', commentIds)
        : { data: [] };

      // Build likes count map and check if user liked
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Set<string>();

      likesData?.forEach(like => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
        
        if (like.user_id === currentUser.id) {
          userLikesMap.add(like.post_id);
        }
      });

      // Build comments count map (including replies)
      const commentsCountMap = new Map<string, number>();
      
      // Count direct comments
      commentsData?.forEach(comment => {
        const count = commentsCountMap.get(comment.post_id) || 0;
        commentsCountMap.set(comment.post_id, count + 1);
      });

      // Add replies to the count
      repliesData?.forEach(reply => {
        const comment = commentsData?.find(c => c.id === reply.comment_id);
        if (comment) {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        }
      });

      // Combine posts with user info, likes, and comments
      const postsWithUsers = posts.map(post => ({
        ...post,
        user: users?.find(u => u.id === post.user_id),
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked_by_user: userLikesMap.has(post.id)
      }));

      return postsWithUsers;
    } catch (error) {
      console.error('Get friend posts error:', error);
      throw error;
    }
  },

  /**
   * Gets the current user's own posts
   */
  async getMyPosts(limit: number = 20): Promise<UserPost[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data: posts, error } = await supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get my posts:', error);
        throw new Error('Failed to get posts');
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      // Get user info
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('Failed to fetch user info:', userError);
      }

      // Get likes and comments counts for all posts
      const postIds = posts.map(p => p.id);
      
      // Get likes data
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Get comments with their IDs
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .in('post_id', postIds);

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: repliesData } = commentIds.length > 0 
        ? await supabase
            .from('comment_replies')
            .select('comment_id')
            .in('comment_id', commentIds)
        : { data: [] };

      // Build likes count map and check if user liked
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Set<string>();

      likesData?.forEach(like => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
        
        if (like.user_id === currentUser.id) {
          userLikesMap.add(like.post_id);
        }
      });

      // Build comments count map (including replies)
      const commentsCountMap = new Map<string, number>();
      
      // Count direct comments
      commentsData?.forEach(comment => {
        const count = commentsCountMap.get(comment.post_id) || 0;
        commentsCountMap.set(comment.post_id, count + 1);
      });

      // Add replies to the count
      repliesData?.forEach(reply => {
        const comment = commentsData?.find(c => c.id === reply.comment_id);
        if (comment) {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        }
      });

      return posts.map(post => ({
        ...post,
        user: userInfo || undefined,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked_by_user: userLikesMap.has(post.id)
      }));
    } catch (error) {
      console.error('Get my posts error:', error);
      throw error;
    }
  },

  /**
   * Uploads an image from React Native
   */
  async uploadImage(imageUri: string, userId: string): Promise<string> {
    try {
      console.log('📤 Starting image upload:', imageUri);

      // Use fetch with ArrayBuffer instead of blob to avoid 0-byte uploads in React Native
      console.log('📥 Reading file from URI...');
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      // Get as ArrayBuffer instead of blob
      const arrayBuffer = await response.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;
      
      console.log('📦 File details:');
      console.log('  - Size:', fileSize, 'bytes', `(${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      
      if (fileSize === 0) {
        throw new Error('File is empty (0 bytes). Please try selecting a different image.');
      }
      
      if (fileSize > 10 * 1024 * 1024) {
        throw new Error(`File is too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum is 10MB.`);
      }

      // Get file extension from URI
      const fileExt = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      console.log('📝 Uploading as:', fileName);
      console.log('📝 Content type:', `image/${fileExt}`);

      // Upload to Supabase Storage using ArrayBuffer
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: `image/${fileExt}`,
        });

      if (error) {
        console.error('❌ Image upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      console.log('✅ File uploaded successfully');
      console.log('📤 Upload response:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', publicUrl);

      // Test if the URL is accessible
      console.log('🧪 Testing URL accessibility...');
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        console.log('🧪 URL test status:', testResponse.status);
        
        if (!testResponse.ok) {
          console.error('❌ URL is not accessible! Status:', testResponse.status);
          
          if (testResponse.status === 404) {
            throw new Error('Image not found in storage (404). The upload may have failed silently.');
          } else if (testResponse.status === 403) {
            throw new Error('Access denied (403). The post-images bucket must be set to public in Supabase Dashboard.');
          } else {
            throw new Error(`URL returned status ${testResponse.status}. Please check Supabase Storage settings.`);
          }
        } else {
          console.log('✅ URL is accessible!');
        }
      } catch (testError) {
        console.error('❌ Failed to test URL:', testError);
        throw testError;
      }

      console.log('✅ Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  },

  /**
   * Creates a new post
   */
  async createPost(content: string, imageUri?: string): Promise<UserPost> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim() && !imageUri) {
        throw new Error('Post content or image is required');
      }

      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageUri) {
        console.log('📸 Uploading image for post...');
        imageUrl = await this.uploadImage(imageUri, currentUser.id);
        console.log('✅ Image URL received:', imageUrl);
      }

      console.log('📝 Creating post with data:', { 
        content: content.trim(), 
        imageUrl,
        hasImage: !!imageUrl 
      });

      // Create post in database
      const { data, error } = await supabase
        .from('user_posts')
        .insert({
          user_id: currentUser.id,
          content: content.trim(),
          image_url: imageUrl
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Post creation error:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      // Fetch user data separately
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .eq('id', currentUser.id)
        .single();
      
      if (userError) {
        console.error('Failed to fetch user info:', userError);
      }

      return {
        ...data,
        user: userInfo || undefined,
        likes_count: 0,
        comments_count: 0,
        is_liked_by_user: false
      };
    } catch (error) {
      console.error('Post creation failed:', error);
      throw error;
    }
  },

  /**
   * Deletes a post
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id); // Ensure user can only delete their own posts

      if (error) {
        console.error('Failed to delete post:', error);
        throw new Error(`Failed to delete post: ${error.message}`);
      }
    } catch (error) {
      console.error('Delete post error:', error);
      throw error;
    }
  },

  /**
   * Toggles like on a post
   */
  async toggleLike(postId: string): Promise<boolean> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
        return false; // unliked
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });

        if (error) throw error;
        return true; // liked
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      throw error;
    }
  },

  /**
   * Picks an image from the device
   */
  async pickImage(): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Pick image error:', error);
      throw error;
    }
  },
};
