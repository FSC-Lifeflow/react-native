import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService, UserPost } from '../services/postService';
import { Alert, Platform } from 'react-native';

/**
 * Hook to fetch friend posts (social feed)
 */
export function useFriendPosts(limit: number = 20) {
  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['posts', 'friends', limit],
    queryFn: () => postService.getFriendPosts(limit),
  });

  return {
    posts,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch user's own posts
 */
export function useMyPosts(limit: number = 20) {
  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['posts', 'my', limit],
    queryFn: () => postService.getMyPosts(limit),
  });

  return {
    posts,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to create a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ content, imageUri }: { content: string; imageUri?: string }) =>
      postService.createPost(content, imageUri),
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      if (Platform.OS === 'web') {
        window.alert('Post created successfully!');
      } else {
        Alert.alert('Success', 'Post created successfully!');
      }
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to create post: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to create post: ${error.message}`);
      }
    },
  });

  return {
    createPost: mutation.mutate,
    isCreating: mutation.isPending,
  };
}

/**
 * Hook to delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to delete post: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to delete post: ${error.message}`);
      }
    },
  });

  return {
    deletePost: mutation.mutate,
    isDeleting: mutation.isPending,
  };
}

/**
 * Hook to toggle like on a post
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (postId: string) => postService.toggleLike(postId),
    onMutate: async (postId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['posts']);

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        
        return old.map((post: UserPost) => {
          if (post.id === postId) {
            const isLiked = post.is_liked_by_user;
            return {
              ...post,
              is_liked_by_user: !isLiked,
              likes_count: isLiked ? (post.likes_count || 1) - 1 : (post.likes_count || 0) + 1,
            };
          }
          return post;
        });
      });

      return { previousPosts };
    },
    onError: (err, postId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return {
    toggleLike: mutation.mutate,
    isToggling: mutation.isPending,
  };
}

/**
 * Hook to pick an image
 */
export function usePickImage() {
  const mutation = useMutation({
    mutationFn: () => postService.pickImage(),
  });

  return {
    pickImage: mutation.mutate,
    isPicking: mutation.isPending,
    imageUri: mutation.data,
  };
}
