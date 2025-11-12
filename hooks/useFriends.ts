import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendService, Friend, FriendRequest, UserSearchResult } from '../services/friendService';
import { Alert, Platform } from 'react-native';

/**
 * Hook to manage friends list
 */
export function useFriends() {
  const queryClient = useQueryClient();

  const { data: friends = [], isLoading, error, refetch } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendService.getFriends(),
  });

  const { data: friendCount = 0 } = useQuery({
    queryKey: ['friendCount'],
    queryFn: () => friendService.getFriendCount(),
  });

  const unfriendMutation = useMutation({
    mutationFn: (friendshipId: string) => friendService.unfriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendCount'] });
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to unfriend: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to unfriend: ${error.message}`);
      }
    },
  });

  return {
    friends,
    friendCount,
    isLoading,
    error,
    refetch,
    unfriend: unfriendMutation.mutate,
    isUnfriending: unfriendMutation.isPending,
  };
}

/**
 * Hook to manage friend requests
 */
export function useFriendRequests() {
  const queryClient = useQueryClient();

  const { data: receivedRequests = [], isLoading: isLoadingReceived, refetch: refetchReceived } = useQuery({
    queryKey: ['friendRequests', 'received'],
    queryFn: () => friendService.getReceivedRequests(),
  });

  const { data: sentRequests = [], isLoading: isLoadingSent, refetch: refetchSent } = useQuery({
    queryKey: ['friendRequests', 'sent'],
    queryFn: () => friendService.getSentRequests(),
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['friendRequests', 'count'],
    queryFn: () => friendService.getPendingRequestCount(),
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => friendService.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendCount'] });
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to accept request: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to accept request: ${error.message}`);
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => friendService.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to reject request: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to reject request: ${error.message}`);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => friendService.cancelFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to cancel request: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to cancel request: ${error.message}`);
      }
    },
  });

  return {
    receivedRequests,
    sentRequests,
    pendingCount,
    isLoading: isLoadingReceived || isLoadingSent,
    refetchReceived,
    refetchSent,
    acceptRequest: acceptMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    cancelRequest: cancelMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCanceling: cancelMutation.isPending,
  };
}

/**
 * Hook to search for users
 */
export function useUserSearch(query: string) {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['userSearch', query],
    queryFn: () => friendService.searchUsers(query),
    enabled: query.trim().length >= 2,
  });

  return {
    users,
    isLoading,
    error,
  };
}

/**
 * Hook to send friend requests
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userId: string) => friendService.sendFriendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
      if (Platform.OS === 'web') {
        window.alert('Friend request sent!');
      } else {
        Alert.alert('Success', 'Friend request sent!');
      }
    },
    onError: (error: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to send request: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to send request: ${error.message}`);
      }
    },
  });

  return {
    sendRequest: mutation.mutate,
    isSending: mutation.isPending,
  };
}

/**
 * Hook to check friendship status with a specific user
 */
export function useFriendshipStatus(userId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['friendshipStatus', userId],
    queryFn: () => friendService.getFriendshipStatus(userId!),
    enabled: !!userId,
  });

  return {
    status: data,
    isLoading,
  };
}
