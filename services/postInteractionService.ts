import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

/**
 * Post Like data structure
 */
export type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

/**
 * Comment data structure
 */
export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
  likes_count?: number;
  is_liked_by_user?: boolean;
  replies?: CommentReply[];
  replies_count?: number;
};

/**
 * Comment Reply data structure
 */
export type CommentReply = {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
};

/**
 * Comment Like data structure
 */
export type CommentLike = {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
};

/**
 * Post Interaction Service
 * Handles likes, comments, and replies on posts
 */
export const postInteractionService = {
  // =====================================================
  // POST LIKES
  // =====================================================

  /**
   * Likes a post
   * @param postId - ID of the post to like
   */
  async likePost(postId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the post to find the post owner
      const { data: post, error: postError } = await supabase
        .from('user_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Failed to get post:', postError);
        throw new Error('Failed to get post');
      }

      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) {
        // If already liked, ignore the error
        if (error.code === '23505') {
          console.log('Post already liked');
          return;
        }
        console.error('Failed to like post:', error);
        throw new Error('Failed to like post');
      }

      // Send notification to post owner (if not liking own post)
      if (post.user_id !== currentUser.id) {
        try {
          // Get current user's profile info
          const { data: userProfile } = await supabase
            .from('users')
            .select('first_name, last_name, username')
            .eq('id', currentUser.id)
            .single();

          if (userProfile) {
            await notificationService.createNotification({
              user_id: post.user_id,
              type: 'post_like',
              title: 'New Like',
              message: `${userProfile.first_name} ${userProfile.last_name} liked your post`,
              read: false,
              data: {
                post_id: postId,
                liker_id: currentUser.id,
                liker_name: `${userProfile.first_name} ${userProfile.last_name}`,
                liker_username: userProfile.username
              }
            });
          }
        } catch (notifError) {
          console.error('Failed to send like notification:', notifError);
          // Don't throw - like was successful even if notification failed
        }
      }
    } catch (error) {
      console.error('Like post error:', error);
      throw error;
    }
  },

  /**
   * Unlikes a post
   * @param postId - ID of the post to unlike
   */
  async unlikePost(postId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to unlike post:', error);
        throw new Error('Failed to unlike post');
      }
    } catch (error) {
      console.error('Unlike post error:', error);
      throw error;
    }
  },

  /**
   * Gets the number of likes for a post
   * @param postId - ID of the post
   * @returns Number of likes
   */
  async getPostLikesCount(postId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        console.error('Failed to get post likes count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Get post likes count error:', error);
      return 0;
    }
  },

  /**
   * Checks if the current user has liked a post
   * @param postId - ID of the post
   * @returns True if liked, false otherwise
   */
  async isPostLikedByUser(postId: string): Promise<boolean> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return false;
      }

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to check if post is liked:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Check post liked error:', error);
      return false;
    }
  },

  // =====================================================
  // POST COMMENTS
  // =====================================================

  /**
   * Creates a comment on a post
   * @param postId - ID of the post to comment on
   * @param content - Content of the comment
   * @returns The created comment
   */
  async createComment(postId: string, content: string): Promise<PostComment> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Comment content cannot be empty');
      }

      // Get the post to find the post owner
      const { data: post, error: postError } = await supabase
        .from('user_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Failed to get post:', postError);
        throw new Error('Failed to get post');
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create comment:', error);
        throw new Error('Failed to create comment');
      }

      // Get user info
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      // Send notification to post owner (if not commenting on own post)
      if (post.user_id !== currentUser.id && userInfo) {
        try {
          await notificationService.createNotification({
            user_id: post.user_id,
            type: 'post_comment',
            title: 'New Comment',
            message: `${userInfo.first_name} ${userInfo.last_name} commented on your post`,
            read: false,
            data: {
              post_id: postId,
              comment_id: data.id,
              commenter_id: currentUser.id,
              commenter_name: `${userInfo.first_name} ${userInfo.last_name}`,
              commenter_username: userInfo.username,
              comment_preview: content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')
            }
          });
        } catch (notifError) {
          console.error('Failed to send comment notification:', notifError);
          // Don't throw - comment was successful even if notification failed
        }
      }

      return {
        ...data,
        user: userInfo || undefined,
        likes_count: 0,
        is_liked_by_user: false,
        replies: [],
        replies_count: 0
      };
    } catch (error) {
      console.error('Create comment error:', error);
      throw error;
    }
  },

  /**
   * Gets comments for a post with user info, likes count, and replies
   * @param postId - ID of the post
   * @returns Array of comments
   */
  async getPostComments(postId: string): Promise<PostComment[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get comments
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get comments:', error);
        throw new Error('Failed to get comments');
      }

      if (!comments || comments.length === 0) {
        return [];
      }

      // Get user info for all comments
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .in('id', userIds);

      // Get likes count for each comment
      const commentIds = comments.map(c => c.id);
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);

      // Get replies count for each comment
      const { data: repliesData } = await supabase
        .from('comment_replies')
        .select('comment_id')
        .in('comment_id', commentIds);

      // Build likes count map and check if user liked
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Set<string>();

      likesData?.forEach(like => {
        const count = likesCountMap.get(like.comment_id) || 0;
        likesCountMap.set(like.comment_id, count + 1);
        
        if (currentUser && like.user_id === currentUser.id) {
          userLikesMap.add(like.comment_id);
        }
      });

      // Build replies count map
      const repliesCountMap = new Map<string, number>();
      repliesData?.forEach(reply => {
        const count = repliesCountMap.get(reply.comment_id) || 0;
        repliesCountMap.set(reply.comment_id, count + 1);
      });

      // Combine data
      return comments.map(comment => ({
        ...comment,
        user: users?.find(u => u.id === comment.user_id),
        likes_count: likesCountMap.get(comment.id) || 0,
        is_liked_by_user: userLikesMap.has(comment.id),
        replies: [],
        replies_count: repliesCountMap.get(comment.id) || 0
      }));
    } catch (error) {
      console.error('Get comments error:', error);
      throw error;
    }
  },

  /**
   * Updates a comment
   * @param commentId - ID of the comment to update
   * @param content - New content
   */
  async updateComment(commentId: string, content: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Comment content cannot be empty');
      }

      const { error } = await supabase
        .from('post_comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to update comment:', error);
        throw new Error('Failed to update comment');
      }
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  },

  /**
   * Deletes a comment
   * @param commentId - ID of the comment to delete
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to delete comment:', error);
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  // =====================================================
  // COMMENT LIKES
  // =====================================================

  /**
   * Likes a comment
   * @param commentId - ID of the comment to like
   */
  async likeComment(commentId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: currentUser.id
        });

      if (error) {
        // If already liked, ignore the error
        if (error.code === '23505') {
          console.log('Comment already liked');
          return;
        }
        console.error('Failed to like comment:', error);
        throw new Error('Failed to like comment');
      }
    } catch (error) {
      console.error('Like comment error:', error);
      throw error;
    }
  },

  /**
   * Unlikes a comment
   * @param commentId - ID of the comment to unlike
   */
  async unlikeComment(commentId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to unlike comment:', error);
        throw new Error('Failed to unlike comment');
      }
    } catch (error) {
      console.error('Unlike comment error:', error);
      throw error;
    }
  },

  // =====================================================
  // COMMENT REPLIES
  // =====================================================

  /**
   * Creates a reply to a comment
   * @param commentId - ID of the comment to reply to
   * @param content - Content of the reply
   * @returns The created reply
   */
  async createReply(commentId: string, content: string): Promise<CommentReply> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Reply content cannot be empty');
      }

      // Get the comment to find the comment owner and post info
      const { data: comment, error: commentError } = await supabase
        .from('post_comments')
        .select('user_id, post_id')
        .eq('id', commentId)
        .single();

      if (commentError) {
        console.error('Failed to get comment:', commentError);
        throw new Error('Failed to get comment');
      }

      const { data, error } = await supabase
        .from('comment_replies')
        .insert({
          comment_id: commentId,
          user_id: currentUser.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create reply:', error);
        throw new Error('Failed to create reply');
      }

      // Get user info
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      // Send notification to comment owner (if not replying to own comment)
      if (comment.user_id !== currentUser.id && userInfo) {
        try {
          await notificationService.createNotification({
            user_id: comment.user_id,
            type: 'comment_reply',
            title: 'New Reply',
            message: `${userInfo.first_name} ${userInfo.last_name} replied to your comment`,
            read: false,
            data: {
              post_id: comment.post_id,
              comment_id: commentId,
              reply_id: data.id,
              replier_id: currentUser.id,
              replier_name: `${userInfo.first_name} ${userInfo.last_name}`,
              replier_username: userInfo.username,
              reply_preview: content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')
            }
          });
        } catch (notifError) {
          console.error('Failed to send reply notification:', notifError);
          // Don't throw - reply was successful even if notification failed
        }
      }

      return {
        ...data,
        user: userInfo || undefined
      };
    } catch (error) {
      console.error('Create reply error:', error);
      throw error;
    }
  },

  /**
   * Gets replies for a comment
   * @param commentId - ID of the comment
   * @returns Array of replies
   */
  async getCommentReplies(commentId: string): Promise<CommentReply[]> {
    try {
      const { data: replies, error } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get replies:', error);
        throw new Error('Failed to get replies');
      }

      if (!replies || replies.length === 0) {
        return [];
      }

      // Get user info for all replies
      const userIds = [...new Set(replies.map(r => r.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .in('id', userIds);

      return replies.map(reply => ({
        ...reply,
        user: users?.find(u => u.id === reply.user_id)
      }));
    } catch (error) {
      console.error('Get replies error:', error);
      throw error;
    }
  },

  /**
   * Updates a reply
   * @param replyId - ID of the reply to update
   * @param content - New content
   */
  async updateReply(replyId: string, content: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Reply content cannot be empty');
      }

      const { error } = await supabase
        .from('comment_replies')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', replyId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to update reply:', error);
        throw new Error('Failed to update reply');
      }
    } catch (error) {
      console.error('Update reply error:', error);
      throw error;
    }
  },

  /**
   * Deletes a reply
   * @param replyId - ID of the reply to delete
   */
  async deleteReply(replyId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('comment_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to delete reply:', error);
        throw new Error('Failed to delete reply');
      }
    } catch (error) {
      console.error('Delete reply error:', error);
      throw error;
    }
  }
};
