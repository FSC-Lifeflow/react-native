import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/Card';
import { useFriendPosts, useCreatePost, useToggleLike, useDeletePost } from '@/hooks/usePosts';
import { postService } from '@/services/postService';
import { postInteractionService, type PostComment } from '@/services/postInteractionService';
import { useAuth } from '@/contexts/AuthContext';
import { MentionText } from '@/components/MentionText';
import { MentionTextarea } from '@/components/MentionTextarea';
import { motivationService } from '@/services/motivationService';
import { useFriends } from '@/hooks/useFriends';
import { Friend } from '@/services/friendService';
import { notificationService } from '@/services/notificationService';
import { googleCalendarService, CalendarEvent } from '@/services/googleCalendarService';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { posts, isLoading, refetch } = useFriendPosts();
  const { createPost, isCreating } = useCreatePost();
  const { toggleLike } = useToggleLike();
  const { deletePost, isDeleting } = useDeletePost();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Motivation states
  const [showMotivationMenuModal, setShowMotivationMenuModal] = useState(false);
  const [showSendMotivationModal, setShowSendMotivationModal] = useState(false);
  const [selectedMotivationFriends, setSelectedMotivationFriends] = useState<Friend[]>([]);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [isSendingMotivation, setIsSendingMotivation] = useState(false);
  const [isRequestingMotivation, setIsRequestingMotivation] = useState(false);
  
  // Scheduled workout invitation states
  const [showScheduledWorkoutModal, setShowScheduledWorkoutModal] = useState(false);
  const [scheduledWorkoutStep, setScheduledWorkoutStep] = useState(1);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [selectedWorkoutFriends, setSelectedWorkoutFriends] = useState<Friend[]>([]);
  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  
  // Challenge workout states
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeStep, setChallengeStep] = useState(1);
  const [challengeTimeOption, setChallengeTimeOption] = useState<'set' | 'flexible'>('set');
  const [challengeWorkoutForm, setChallengeWorkoutForm] = useState('');
  const [challengeDateTime, setChallengeDateTime] = useState('');
  const [challengeDuration, setChallengeDuration] = useState('');
  const [challengeNote, setChallengeNote] = useState('');
  const [selectedChallengeFriends, setSelectedChallengeFriends] = useState<Friend[]>([]);
  const [isSendingChallenges, setIsSendingChallenges] = useState(false);
  
  // Comments states
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Map<string, PostComment[]>>(new Map());
  const [commentText, setCommentText] = useState<Map<string, string>>(new Map());
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState<Set<string>>(new Set());
  
  // Reply states
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [commentReplies, setCommentReplies] = useState<Map<string, any[]>>(new Map());
  const [replyText, setReplyText] = useState<Map<string, string>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [submittingReply, setSubmittingReply] = useState<Set<string>>(new Set());
  
  const { friends } = useFriends();
  const { isAuthenticated: isCalendarConnected } = useGoogleCalendar();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) {
      Alert.alert('Error', 'Please enter some content or select an image');
      return;
    }

    createPost(
      { content: newPostContent, imageUri: selectedImage || undefined },
      {
        onSuccess: () => {
          setNewPostContent('');
          setSelectedImage(null);
          setShowCreateModal(false);
        },
      }
    );
  };

  const handlePickImage = async () => {
    try {
      const uri = await postService.pickImage();
      if (uri) {
        setSelectedImage(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePost(postId) },
      ]
    );
  };

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load comments if not already loaded
      if (!postComments.has(postId)) {
        const newLoading = new Set(loadingComments);
        newLoading.add(postId);
        setLoadingComments(newLoading);
        try {
          const comments = await postInteractionService.getPostComments(postId);
          setPostComments(new Map(postComments).set(postId, comments));
        } catch (error) {
          Alert.alert('Error', 'Failed to load comments');
        } finally {
          const updatedLoading = new Set(loadingComments);
          updatedLoading.delete(postId);
          setLoadingComments(updatedLoading);
        }
      }
    }
    
    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText.get(postId);
    if (!text?.trim()) return;
    
    const newSubmitting = new Set(submittingComment);
    newSubmitting.add(postId);
    setSubmittingComment(newSubmitting);
    try {
      const newComment = await postInteractionService.createComment(postId, text);
      
      // Add comment to local state
      const currentComments = postComments.get(postId) || [];
      setPostComments(new Map(postComments).set(postId, [...currentComments, newComment]));
      
      // Clear input
      const newCommentText = new Map(commentText);
      newCommentText.delete(postId);
      setCommentText(newCommentText);
      
      // Refresh posts to update comment count
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      const updatedSubmitting = new Set(submittingComment);
      updatedSubmitting.delete(postId);
      setSubmittingComment(updatedSubmitting);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await postInteractionService.deleteComment(commentId);
              
              // Remove from local state
              const currentComments = postComments.get(postId) || [];
              setPostComments(
                new Map(postComments).set(
                  postId,
                  currentComments.filter(c => c.id !== commentId)
                )
              );
              
              refetch();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const toggleReplies = async (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      // Load replies if not already loaded
      if (!commentReplies.has(commentId)) {
        const newLoading = new Set(loadingReplies);
        newLoading.add(commentId);
        setLoadingReplies(newLoading);
        try {
          const replies = await postInteractionService.getCommentReplies(commentId);
          setCommentReplies(new Map(commentReplies).set(commentId, replies));
        } catch (error) {
          Alert.alert('Error', 'Failed to load replies');
        } finally {
          const updatedLoading = new Set(loadingReplies);
          updatedLoading.delete(commentId);
          setLoadingReplies(updatedLoading);
        }
      }
    }
    
    setExpandedReplies(newExpanded);
  };

  const handleAddReply = async (commentId: string) => {
    const text = replyText.get(commentId);
    if (!text?.trim()) return;
    
    const newSubmitting = new Set(submittingReply);
    newSubmitting.add(commentId);
    setSubmittingReply(newSubmitting);
    try {
      const newReply = await postInteractionService.createReply(commentId, text);
      
      // Add reply to local state
      const currentReplies = commentReplies.get(commentId) || [];
      setCommentReplies(new Map(commentReplies).set(commentId, [...currentReplies, newReply]));
      
      // Clear input
      const newReplyText = new Map(replyText);
      newReplyText.delete(commentId);
      setReplyText(newReplyText);
      
      // Refresh to update reply counts
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add reply');
    } finally {
      const updatedSubmitting = new Set(submittingReply);
      updatedSubmitting.delete(commentId);
      setSubmittingReply(updatedSubmitting);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await postInteractionService.deleteReply(replyId);
              
              // Remove from local state
              const currentReplies = commentReplies.get(commentId) || [];
              setCommentReplies(
                new Map(commentReplies).set(
                  commentId,
                  currentReplies.filter(r => r.id !== replyId)
                )
              );
              
              refetch();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reply');
            }
          },
        },
      ]
    );
  };

  const handleSendMotivation = async () => {
    if (selectedMotivationFriends.length === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to motivate.');
      return;
    }

    if (!motivationMessage.trim()) {
      Alert.alert('Empty Message', 'Please write a motivational message.');
      return;
    }

    setIsSendingMotivation(true);
    try {
      const friendIds = selectedMotivationFriends.map(f => f.id);
      await motivationService.sendMotivation(friendIds, motivationMessage);
      
      const friendNames = selectedMotivationFriends.length === 1
        ? `${selectedMotivationFriends[0].first_name} ${selectedMotivationFriends[0].last_name}`
        : `${selectedMotivationFriends.length} friends`;
      
      Alert.alert('Motivation Sent!', `Your motivational message was sent to ${friendNames}.`);
      
      // Reset modal state
      setShowSendMotivationModal(false);
      setSelectedMotivationFriends([]);
      setMotivationMessage('');
    } catch (error: any) {
      console.error('❌ Error sending motivation:', error);
      Alert.alert('Error', error.message || 'Failed to send motivation. Please try again.');
    } finally {
      setIsSendingMotivation(false);
    }
  };

  const handleRequestMotivation = async () => {
    setIsRequestingMotivation(true);
    try {
      const friendCount = await motivationService.requestMotivation();
      Alert.alert(
        'Request Sent!',
        `Motivation request sent to ${friendCount} friend${friendCount === 1 ? '' : 's'}.`
      );
    } catch (error: any) {
      console.error('❌ Error requesting motivation:', error);
      Alert.alert('Error', error.message || 'Failed to request motivation. Please try again.');
    } finally {
      setIsRequestingMotivation(false);
    }
  };

  const toggleFriendSelection = (friend: Friend) => {
    setSelectedMotivationFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const toggleWorkoutFriendSelection = (friend: Friend) => {
    setSelectedWorkoutFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleOpenScheduledWorkoutModal = async () => {
    if (!isCalendarConnected) {
      Alert.alert(
        'Google Calendar Not Connected',
        'Please connect your Google Calendar to invite friends to scheduled workouts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowScheduledWorkoutModal(true);
    setIsLoadingCalendarEvents(true);
    
    try {
      if (!user?.id) throw new Error('Not authenticated');
      
      const now = new Date();
      const timeMax = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Next 30 days
      
      const { events } = await googleCalendarService.fetchEvents(user.id);
      
      // Filter for workout-related events
      const workoutEvents = events.filter((event: CalendarEvent) => {
        const summary = event.summary?.toLowerCase() || '';
        return summary.includes('workout') || 
               summary.includes('gym') || 
               summary.includes('exercise') || 
               summary.includes('training') ||
               summary.includes('fitness') ||
               summary.includes('yoga') ||
               summary.includes('run') ||
               summary.includes('cycling') ||
               summary.includes('swimming');
      });
      
      setCalendarEvents(workoutEvents);
    } catch (error: any) {
      console.error('Error loading calendar events:', error);
      Alert.alert('Error', 'Failed to load calendar events. Please try again.');
      setShowScheduledWorkoutModal(false);
    } finally {
      setIsLoadingCalendarEvents(false);
    }
  };

  const handleSendWorkoutInvitations = async () => {
    if (selectedWorkoutFriends.length === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to invite.');
      return;
    }

    if (!selectedCalendarEvent) {
      Alert.alert('No Event Selected', 'Please select a workout event.');
      return;
    }

    setIsSendingInvitations(true);
    try {
      if (!user?.id) throw new Error('Not authenticated');

      // Send notifications to each selected friend
      const notificationPromises = selectedWorkoutFriends.map(friend =>
        notificationService.createNotification({
          user_id: friend.id,
          type: 'scheduled_workout_invitation',
          title: 'Scheduled Workout Invitation',
          message: `${user.first_name || 'Someone'} ${user.last_name || ''} invited you to join their workout: ${selectedCalendarEvent.summary}`,
          data: {
            inviter_id: user.id,
            inviter_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            event_id: selectedCalendarEvent.id,
            event_summary: selectedCalendarEvent.summary,
            event_start: selectedCalendarEvent.start.dateTime || selectedCalendarEvent.start.date,
            event_end: selectedCalendarEvent.end.dateTime || selectedCalendarEvent.end.date,
            event_location: selectedCalendarEvent.location,
            event_description: selectedCalendarEvent.description,
          },
          read: false,
        })
      );
      
      await Promise.all(notificationPromises);
      
      const friendNames = selectedWorkoutFriends.length === 1
        ? `${selectedWorkoutFriends[0].first_name} ${selectedWorkoutFriends[0].last_name}`
        : `${selectedWorkoutFriends.length} friends`;
      
      Alert.alert(
        'Invitations Sent!',
        `Successfully invited ${friendNames} to your workout.`
      );
      
      // Reset modal state
      setShowScheduledWorkoutModal(false);
      setScheduledWorkoutStep(1);
      setSelectedCalendarEvent(null);
      setSelectedWorkoutFriends([]);
      setCalendarEvents([]);
    } catch (error: any) {
      console.error('❌ Error sending invitations:', error);
      Alert.alert('Error', error.message || 'Failed to send invitations. Please try again.');
    } finally {
      setIsSendingInvitations(false);
    }
  };

  const toggleChallengeFriendSelection = (friend: Friend) => {
    setSelectedChallengeFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleSendChallenges = async () => {
    if (selectedChallengeFriends.length === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to challenge.');
      return;
    }

    if (!challengeWorkoutForm) {
      Alert.alert('No Workout Selected', 'Please select a workout form.');
      return;
    }

    if (challengeTimeOption === 'set' && (!challengeDateTime || !challengeDuration)) {
      Alert.alert('Incomplete Details', 'Please set date/time and duration for the challenge.');
      return;
    }

    setIsSendingChallenges(true);
    try {
      if (!user?.id) throw new Error('Not authenticated');

      // Send notifications to each selected friend
      const notificationPromises = selectedChallengeFriends.map(friend =>
        notificationService.createNotification({
          user_id: friend.id,
          type: 'workout_challenge',
          title: 'Workout Challenge',
          message: challengeTimeOption === 'set'
            ? `${user.first_name || 'Someone'} ${user.last_name || ''} challenged you to a ${challengeWorkoutForm} workout!`
            : `${user.first_name || 'Someone'} ${user.last_name || ''} challenged you to a ${challengeWorkoutForm} workout - complete it on your own time!`,
          data: {
            challenger_id: user.id,
            challenger_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            challenge_type: 'workout_challenge',
            workout_form: challengeWorkoutForm,
            time_option: challengeTimeOption,
            workout_time: challengeTimeOption === 'set' ? challengeDateTime : null,
            workout_duration: challengeTimeOption === 'set' ? challengeDuration : null,
            workout_note: challengeNote || null,
          },
          read: false,
        })
      );
      
      await Promise.all(notificationPromises);
      
      const friendNames = selectedChallengeFriends.length === 1
        ? `${selectedChallengeFriends[0].first_name} ${selectedChallengeFriends[0].last_name}`
        : `${selectedChallengeFriends.length} friends`;
      
      Alert.alert(
        'Challenges Sent!',
        `Workout challenge sent to ${friendNames}.`
      );
      
      // Reset modal state
      setShowChallengeModal(false);
      setChallengeStep(1);
      setChallengeTimeOption('set');
      setChallengeWorkoutForm('');
      setChallengeDateTime('');
      setChallengeDuration('');
      setChallengeNote('');
      setSelectedChallengeFriends([]);
    } catch (error: any) {
      console.error('❌ Error sending challenges:', error);
      Alert.alert('Error', error.message || 'Failed to send challenges. Please try again.');
    } finally {
      setIsSendingChallenges(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderPost = (post: any) => (
    <Card key={post.id} style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/user/${post.user_id}` as any)}
          activeOpacity={0.7}
        >
          {post.user?.avatar_url ? (
            <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={20} color={colors.foreground} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {post.user?.first_name} {post.user?.last_name}
            </Text>
            <Text style={[styles.postTime, { color: colors.foreground, opacity: 0.6 }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        {post.user_id === user?.id && (
          <TouchableOpacity onPress={() => handleDeletePost(post.id)} disabled={isDeleting}>
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Content with @mention support */}
      {post.content && (
        <MentionText 
          text={post.content} 
          style={[styles.postContent, { color: colors.foreground }]}
          mentionColor={colors.tint}
        />
      )}

      {/* Post Image */}
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleLike(post.id)}
        >
          <Ionicons
            name={post.is_liked_by_user ? 'heart' : 'heart-outline'}
            size={24}
            color={post.is_liked_by_user ? '#ff3b30' : colors.foreground}
          />
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleComments(post.id)}
        >
          <Ionicons 
            name={expandedComments.has(post.id) ? 'chatbubble' : 'chatbubble-outline'} 
            size={22} 
            color={colors.foreground} 
          />
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            {post.comments_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {expandedComments.has(post.id) && (
        <View style={styles.commentsSection}>
          {loadingComments.has(post.id) ? (
            <ActivityIndicator color={colors.tint} style={{ marginVertical: Spacing.md }} />
          ) : (
            <>
              {/* Comments List */}
              {(postComments.get(post.id) || []).map((comment) => (
                <View key={comment.id} style={[styles.commentItem, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity 
                    onPress={() => router.push(`/user/${comment.user_id}` as any)}
                  >
                    <Text style={[styles.commentAuthor, { color: colors.tint }]}>{comment.user?.first_name} {comment.user?.last_name}</Text>
                  </TouchableOpacity>
                  <MentionText 
                    text={comment.content} 
                    style={[styles.commentText, { color: colors.foreground }]}
                    mentionColor={colors.tint}
                  />
                  <View style={styles.commentMeta}>
                    <Text style={[styles.commentTime, { color: colors.subtext }]}>{formatTimeAgo(comment.created_at)}</Text>
                    <TouchableOpacity
                      onPress={() => toggleReplies(comment.id)}
                      style={{ marginLeft: Spacing.md }}
                    >
                      <Text style={[styles.replyButton, { color: colors.tint }]}>{comment.replies_count || 0} {comment.replies_count === 1 ? 'reply' : 'replies'}</Text>
                    </TouchableOpacity>
                    {comment.user_id === user?.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(post.id, comment.id)}
                        style={{ marginLeft: Spacing.md }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#ff3b30" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Replies Section */}
                  {expandedReplies.has(comment.id) && (
                    <View style={styles.repliesSection}>
                      {loadingReplies.has(comment.id) ? (
                        <ActivityIndicator color={colors.tint} size="small" style={{ marginVertical: Spacing.sm }} />
                      ) : (
                        <>
                          {/* Replies List */}
                          {(commentReplies.get(comment.id) || []).map((reply) => (
                            <View key={reply.id} style={styles.replyItem}>
                              <TouchableOpacity 
                                onPress={() => router.push(`/user/${reply.user_id}` as any)}
                              >
                                <Text style={[styles.replyAuthor, { color: colors.tint }]}>{reply.user?.first_name} {reply.user?.last_name}</Text>
                              </TouchableOpacity>
                              <MentionText 
                                text={reply.content} 
                                style={[styles.replyText, { color: colors.foreground }]}
                                mentionColor={colors.tint}
                              />
                              <View style={styles.replyMeta}>
                                <Text style={[styles.replyTime, { color: colors.subtext }]}>{formatTimeAgo(reply.created_at)}</Text>
                                {reply.user_id === user?.id && (
                                  <TouchableOpacity
                                    onPress={() => handleDeleteReply(comment.id, reply.id)}
                                    style={{ marginLeft: Spacing.sm }}
                                  >
                                    <Ionicons name="trash-outline" size={12} color="#ff3b30" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          ))}
                          
                          {/* Add Reply Input */}
                          <View style={styles.addReplyContainer}>
                            <MentionTextarea
                              value={replyText.get(comment.id) || ''}
                              onChange={(text) => {
                                const newReplyText = new Map(replyText);
                                newReplyText.set(comment.id, text);
                                setReplyText(newReplyText);
                              }}
                              placeholder="Add a reply..."
                            />
                            <TouchableOpacity
                              style={[styles.sendReplyButton, { backgroundColor: colors.tint }]}
                              onPress={() => handleAddReply(comment.id)}
                              disabled={submittingReply.has(comment.id) || !replyText.get(comment.id)?.trim()}
                            >
                              {submittingReply.has(comment.id) ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons name="send" size={16} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              ))}
              
              {/* Add Comment Input */}
              <View style={styles.addCommentContainer}>
                <MentionTextarea
                  value={commentText.get(post.id) || ''}
                  onChange={(text) => {
                    const newCommentText = new Map(commentText);
                    newCommentText.set(post.id, text);
                    setCommentText(newCommentText);
                  }}
                  placeholder="Add a comment..."
                />
                <TouchableOpacity
                  style={[styles.sendCommentButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleAddComment(post.id)}
                  disabled={submittingComment.has(post.id) || !commentText.get(post.id)?.trim()}
                >
                  {submittingComment.has(post.id) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Feed</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.motivationButtonRect, { backgroundColor: colors.tint }]}
            onPress={() => setShowMotivationMenuModal(true)}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={[styles.motivationButtonText, { color: '#fff' }]}>Motivation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No posts yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
              Add friends to see their posts here
            </Text>
          </View>
        ) : (
          <View style={styles.postsContainer}>{posts.map(renderPost)}</View>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowCreateModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <Ionicons name="close" size={28} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handlePickImage}
                    style={styles.headerImageButton}
                  >
                    <Ionicons name="image-outline" size={28} color={colors.tint} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Post</Text>
                <TouchableOpacity
                  onPress={handleCreatePost}
                  disabled={isCreating || (!newPostContent.trim() && !selectedImage)}
                >
                  <Text
                    style={[
                      styles.postButton,
                      { color: colors.tint },
                      (isCreating || (!newPostContent.trim() && !selectedImage)) && styles.postButtonDisabled,
                    ]}
                  >
                    {isCreating ? 'Posting...' : 'Post'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <MentionTextarea
                  value={newPostContent}
                  onChange={setNewPostContent}
                  placeholder="What's on your mind?"
                  maxLength={500}
                />

                {selectedImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Motivation Menu Modal */}
      <Modal
        visible={showMotivationMenuModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMotivationMenuModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowMotivationMenuModal(false)}
          />
          <View style={styles.motivationMenuContainer}>
            <View style={[styles.motivationMenuContent, { backgroundColor: colors.card }]}>
              <View style={styles.motivationMenuHeader}>
                <Ionicons name="sparkles" size={24} color={colors.tint} />
                <Text style={[styles.motivationMenuTitle, { color: colors.foreground }]}>Motivation</Text>
                <TouchableOpacity onPress={() => setShowMotivationMenuModal(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.motivationMenuSubtitle, { color: colors.foreground, opacity: 0.7 }]}>
                Choose an option to motivate or get motivated
              </Text>

              <View style={styles.motivationOptions}>
                <TouchableOpacity
                  style={[styles.motivationOptionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setShowMotivationMenuModal(false);
                    setShowSendMotivationModal(true);
                  }}
                >
                  <View style={[styles.motivationOptionIcon, { backgroundColor: '#ff3b30' + '20' }]}>
                    <Ionicons name="heart" size={28} color="#ff3b30" />
                  </View>
                  <Text style={[styles.motivationOptionTitle, { color: colors.foreground }]}>Send Motivation</Text>
                  <Text style={[styles.motivationOptionDesc, { color: colors.foreground, opacity: 0.6 }]}>
                    Send an encouraging message to your friends
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.motivationOptionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setShowMotivationMenuModal(false);
                    handleRequestMotivation();
                  }}
                  disabled={isRequestingMotivation}
                >
                  <View style={[styles.motivationOptionIcon, { backgroundColor: '#ff9500' + '20' }]}>
                    {isRequestingMotivation ? (
                      <ActivityIndicator size="small" color="#ff9500" />
                    ) : (
                      <Ionicons name="hand-left" size={28} color="#ff9500" />
                    )}
                  </View>
                  <Text style={[styles.motivationOptionTitle, { color: colors.foreground }]}>Request Motivation</Text>
                  <Text style={[styles.motivationOptionDesc, { color: colors.foreground, opacity: 0.6 }]}>
                    Ask all your friends to motivate you
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Motivation Modal */}
      <Modal
        visible={showSendMotivationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSendMotivationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowSendMotivationModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowSendMotivationModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Send Motivation</Text>
                <TouchableOpacity
                  onPress={handleSendMotivation}
                  disabled={isSendingMotivation || selectedMotivationFriends.length === 0 || !motivationMessage.trim()}
                >
                  <Text
                    style={[
                      styles.postButton,
                      { color: colors.tint },
                      (isSendingMotivation || selectedMotivationFriends.length === 0 || !motivationMessage.trim()) && styles.postButtonDisabled,
                    ]}
                  >
                    {isSendingMotivation ? 'Sending...' : 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Select Friends</Text>
                <View style={styles.friendsList}>
                  {friends.length === 0 ? (
                    <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                      No friends yet. Add friends to send motivation!
                    </Text>
                  ) : (
                    friends.map((friend) => {
                      const isSelected = selectedMotivationFriends.some(f => f.id === friend.id);
                      return (
                        <TouchableOpacity
                          key={friend.id}
                          style={[
                            styles.friendItem,
                            { borderColor: colors.border },
                            isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                          ]}
                          onPress={() => toggleFriendSelection(friend)}
                        >
                          {friend.avatar_url ? (
                            <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                          ) : (
                            <View style={[styles.friendAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                              <Ionicons name="person" size={16} color={colors.foreground} />
                            </View>
                          )}
                          <Text style={[styles.friendName, { color: colors.foreground }]}>
                            {friend.first_name} {friend.last_name}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.tint} style={styles.checkmark} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: Spacing.md }]}>
                  Your Message
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Write an encouraging message..."
                  placeholderTextColor={colors.foreground + '80'}
                  value={motivationMessage}
                  onChangeText={setMotivationMessage}
                  multiline
                  maxLength={300}
                  autoFocus={false}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Scheduled Workout Invitation Modal */}
      <Modal
        visible={showScheduledWorkoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduledWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowScheduledWorkoutModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowScheduledWorkoutModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {scheduledWorkoutStep === 1 ? 'Select Workout' : 'Select Friends'}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepCircle, scheduledWorkoutStep === 1 && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.stepText, { color: scheduledWorkoutStep === 1 ? '#fff' : colors.foreground }]}>1</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
                <View style={[styles.stepCircle, scheduledWorkoutStep === 2 && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.stepText, { color: scheduledWorkoutStep === 2 ? '#fff' : colors.foreground }]}>2</Text>
                </View>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {scheduledWorkoutStep === 1 ? (
                  /* Step 1: Select Calendar Event */
                  <>
                    {isLoadingCalendarEvents ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.tint} />
                        <Text style={[styles.loadingText, { color: colors.foreground }]}>
                          Loading your calendar events...
                        </Text>
                      </View>
                    ) : calendarEvents.length > 0 ? (
                      <>
                        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                          Select a Workout Event
                        </Text>
                        <View style={styles.eventsList}>
                          {calendarEvents.map((event) => {
                            const isSelected = selectedCalendarEvent?.id === event.id;
                            const startDate = event.start.dateTime 
                              ? new Date(event.start.dateTime) 
                              : event.start.date 
                              ? new Date(event.start.date) 
                              : null;

                            return (
                              <TouchableOpacity
                                key={event.id}
                                style={[
                                  styles.eventItem,
                                  { borderColor: colors.border },
                                  isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                                ]}
                                onPress={() => setSelectedCalendarEvent(event)}
                              >
                                <View style={styles.eventContent}>
                                  <Text style={[styles.eventTitle, { color: colors.foreground }]}>
                                    {event.summary}
                                  </Text>
                                  {event.description && (
                                    <Text 
                                      style={[styles.eventDescription, { color: colors.foreground, opacity: 0.6 }]}
                                      numberOfLines={2}
                                    >
                                      {event.description}
                                    </Text>
                                  )}
                                  <View style={styles.eventDetails}>
                                    {startDate && (
                                      <View style={styles.eventDetailItem}>
                                        <Ionicons name="calendar-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                        <Text style={[styles.eventDetailText, { color: colors.foreground, opacity: 0.6 }]}>
                                          {startDate.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: event.start.dateTime ? 'numeric' : undefined,
                                            minute: event.start.dateTime ? '2-digit' : undefined
                                          })}
                                        </Text>
                                      </View>
                                    )}
                                    {event.location && (
                                      <View style={styles.eventDetailItem}>
                                        <Ionicons name="location-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                        <Text 
                                          style={[styles.eventDetailText, { color: colors.foreground, opacity: 0.6 }]}
                                          numberOfLines={1}
                                        >
                                          {event.location}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
                        <Text style={[styles.emptyText, { color: colors.foreground }]}>
                          No upcoming workout events
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                          Create workout events in your Google Calendar to invite friends
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  /* Step 2: Select Friends */
                  <>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Select Friends</Text>
                    <View style={styles.friendsList}>
                      {friends.length === 0 ? (
                        <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                          No friends yet. Add friends to invite them!
                        </Text>
                      ) : (
                        friends.map((friend) => {
                          const isSelected = selectedWorkoutFriends.some(f => f.id === friend.id);
                          return (
                            <TouchableOpacity
                              key={friend.id}
                              style={[
                                styles.friendItem,
                                { borderColor: colors.border },
                                isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                              ]}
                              onPress={() => toggleWorkoutFriendSelection(friend)}
                            >
                              {friend.avatar_url ? (
                                <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                              ) : (
                                <View style={[styles.friendAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                                  <Ionicons name="person" size={16} color={colors.foreground} />
                                </View>
                              )}
                              <Text style={[styles.friendName, { color: colors.foreground }]}>
                                {friend.first_name} {friend.last_name}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.tint} style={styles.checkmark} />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.modalFooter}>
                {scheduledWorkoutStep === 1 ? (
                  <TouchableOpacity
                    style={[
                      styles.fullWidthButton,
                      { backgroundColor: colors.tint },
                      !selectedCalendarEvent && styles.buttonDisabled
                    ]}
                    onPress={() => setScheduledWorkoutStep(2)}
                    disabled={!selectedCalendarEvent}
                  >
                    <Text style={styles.fullWidthButtonText}>Next: Select Friends</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setScheduledWorkoutStep(1)}
                    >
                      <Text style={[styles.halfButtonText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.halfButton,
                        { backgroundColor: colors.tint },
                        (selectedWorkoutFriends.length === 0 || isSendingInvitations) && styles.buttonDisabled
                      ]}
                      onPress={handleSendWorkoutInvitations}
                      disabled={selectedWorkoutFriends.length === 0 || isSendingInvitations}
                    >
                      {isSendingInvitations ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.fullWidthButtonText}>Send Invitations</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Challenge Workout Modal */}
      <Modal
        visible={showChallengeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChallengeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowChallengeModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowChallengeModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {challengeStep === 1 ? 'Challenge Details' : 'Select Friends'}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepCircle, challengeStep === 1 && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.stepText, { color: challengeStep === 1 ? '#fff' : colors.foreground }]}>1</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
                <View style={[styles.stepCircle, challengeStep === 2 && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.stepText, { color: challengeStep === 2 ? '#fff' : colors.foreground }]}>2</Text>
                </View>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {challengeStep === 1 ? (
                  /* Step 1: Challenge Details */
                  <>
                    {/* Time Option Selection */}
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Challenge Time</Text>
                    <View style={styles.timeOptionContainer}>
                      <TouchableOpacity
                        style={[
                          styles.timeOptionButton,
                          { borderColor: colors.border },
                          challengeTimeOption === 'set' && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                        ]}
                        onPress={() => setChallengeTimeOption('set')}
                      >
                        <Ionicons 
                          name="calendar" 
                          size={24} 
                          color={challengeTimeOption === 'set' ? colors.tint : colors.foreground} 
                        />
                        <Text style={[styles.timeOptionText, { color: colors.foreground }]}>Set Time</Text>
                        <Text style={[styles.timeOptionDesc, { color: colors.foreground, opacity: 0.6 }]}>
                          Specific date & time
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.timeOptionButton,
                          { borderColor: colors.border },
                          challengeTimeOption === 'flexible' && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                        ]}
                        onPress={() => setChallengeTimeOption('flexible')}
                      >
                        <Ionicons 
                          name="time" 
                          size={24} 
                          color={challengeTimeOption === 'flexible' ? colors.tint : colors.foreground} 
                        />
                        <Text style={[styles.timeOptionText, { color: colors.foreground }]}>Flexible</Text>
                        <Text style={[styles.timeOptionDesc, { color: colors.foreground, opacity: 0.6 }]}>
                          Friend chooses when
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Conditional Date/Time Fields */}
                    {challengeTimeOption === 'set' && (
                      <>
                        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: Spacing.md }]}>
                          Date & Time
                        </Text>
                        <TextInput
                          style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                          placeholder="e.g., Dec 10, 2025 at 6:00 PM"
                          placeholderTextColor={colors.foreground + '80'}
                          value={challengeDateTime}
                          onChangeText={setChallengeDateTime}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: Spacing.md }]}>
                          Duration
                        </Text>
                        <View style={styles.durationContainer}>
                          {['15', '30', '45', '60', '90', '120'].map((duration) => (
                            <TouchableOpacity
                              key={duration}
                              style={[
                                styles.durationButton,
                                { borderColor: colors.border },
                                challengeDuration === duration && { backgroundColor: colors.tint, borderColor: colors.tint }
                              ]}
                              onPress={() => setChallengeDuration(duration)}
                            >
                              <Text style={[
                                styles.durationText,
                                { color: challengeDuration === duration ? '#fff' : colors.foreground }
                              ]}>
                                {parseInt(duration) >= 60 ? `${parseInt(duration) / 60}h` : `${duration}m`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Workout Form Selection */}
                    <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: Spacing.md }]}>
                      Workout Type
                    </Text>
                    <View style={styles.workoutFormGrid}>
                      {[
                        { value: 'strength', label: 'Strength', icon: 'barbell' },
                        { value: 'cardio', label: 'Cardio', icon: 'heart' },
                        { value: 'yoga', label: 'Yoga', icon: 'body' },
                        { value: 'hiit', label: 'HIIT', icon: 'flash' },
                        { value: 'running', label: 'Running', icon: 'walk' },
                        { value: 'cycling', label: 'Cycling', icon: 'bicycle' },
                      ].map((workout) => (
                        <TouchableOpacity
                          key={workout.value}
                          style={[
                            styles.workoutFormButton,
                            { borderColor: colors.border },
                            challengeWorkoutForm === workout.value && { 
                              backgroundColor: colors.tint + '20', 
                              borderColor: colors.tint 
                            }
                          ]}
                          onPress={() => setChallengeWorkoutForm(workout.value)}
                        >
                          <Ionicons 
                            name={workout.icon as any} 
                            size={24} 
                            color={challengeWorkoutForm === workout.value ? colors.tint : colors.foreground} 
                          />
                          <Text style={[
                            styles.workoutFormText,
                            { color: colors.foreground }
                          ]}>
                            {workout.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Optional Notes */}
                    <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: Spacing.md }]}>
                      Challenge Description (Optional)
                    </Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, minHeight: 80 }]}
                      placeholder="Add details about the challenge..."
                      placeholderTextColor={colors.foreground + '80'}
                      value={challengeNote}
                      onChangeText={setChallengeNote}
                      multiline
                      maxLength={300}
                    />
                  </>
                ) : (
                  /* Step 2: Select Friends */
                  <>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Select Friends to Challenge</Text>
                    <View style={styles.friendsList}>
                      {friends.length === 0 ? (
                        <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                          No friends yet. Add friends to challenge them!
                        </Text>
                      ) : (
                        friends.map((friend) => {
                          const isSelected = selectedChallengeFriends.some(f => f.id === friend.id);
                          return (
                            <TouchableOpacity
                              key={friend.id}
                              style={[
                                styles.friendItem,
                                { borderColor: colors.border },
                                isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                              ]}
                              onPress={() => toggleChallengeFriendSelection(friend)}
                            >
                              {friend.avatar_url ? (
                                <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                              ) : (
                                <View style={[styles.friendAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                                  <Ionicons name="person" size={16} color={colors.foreground} />
                                </View>
                              )}
                              <Text style={[styles.friendName, { color: colors.foreground }]}>
                                {friend.first_name} {friend.last_name}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.tint} style={styles.checkmark} />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.modalFooter}>
                {challengeStep === 1 ? (
                  <TouchableOpacity
                    style={[
                      styles.fullWidthButton,
                      { backgroundColor: colors.tint },
                      (!challengeWorkoutForm || (challengeTimeOption === 'set' && (!challengeDateTime || !challengeDuration))) && styles.buttonDisabled
                    ]}
                    onPress={() => setChallengeStep(2)}
                    disabled={!challengeWorkoutForm || (challengeTimeOption === 'set' && (!challengeDateTime || !challengeDuration))}
                  >
                    <Text style={styles.fullWidthButtonText}>Next: Select Friends</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setChallengeStep(1)}
                    >
                      <Text style={[styles.halfButtonText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.halfButton,
                        { backgroundColor: colors.tint },
                        (selectedChallengeFriends.length === 0 || isSendingChallenges) && styles.buttonDisabled
                      ]}
                      onPress={handleSendChallenges}
                      disabled={selectedChallengeFriends.length === 0 || isSendingChallenges}
                    >
                      {isSendingChallenges ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.fullWidthButtonText}>Send Challenge</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  postsContainer: {
    padding: Spacing.md,
  },
  postCard: {
    marginBottom: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    fontSize: Typography.fontSizes.base,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  mentionText: {
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 3,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  loader: {
    marginTop: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerImageButton: {
    padding: Spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  textInput: {
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  mentionModal: {
    maxHeight: 200,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  mentionList: {
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  mentionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.md,
  },
  mentionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  mentionUsername: {
    fontSize: 14,
    opacity: 0.7,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  motivationButtonRect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  motivationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  motivationMenuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  motivationMenuContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  motivationMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  motivationMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: Spacing.sm,
  },
  motivationMenuSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  motivationOptions: {
    gap: Spacing.md,
  },
  motivationOptionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  motivationOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  motivationOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  motivationOptionDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  friendsList: {
    gap: Spacing.xs,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    marginLeft: 'auto',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  eventsList: {
    gap: Spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  eventDescription: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  eventDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
  },
  modalFooter: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fullWidthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fullWidthButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  halfButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  timeOptionContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timeOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  timeOptionDesc: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  durationButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  workoutFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  workoutFormButton: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  workoutFormText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  commentsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  commentItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  commentAuthor: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  commentText: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.xs,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTime: {
    fontSize: Typography.fontSizes.xs,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sendCommentButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyButton: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  repliesSection: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.lg,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
  },
  replyItem: {
    marginBottom: Spacing.sm,
  },
  replyAuthor: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  replyText: {
    fontSize: Typography.fontSizes.xs,
    marginBottom: Spacing.xs,
  },
  replyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyTime: {
    fontSize: 10,
  },
  addReplyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sendReplyButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
