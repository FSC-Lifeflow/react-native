import { GoogleCalendar } from '@/components/GoogleCalendar';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { WorkoutChallengeAcceptDialog } from '@/components/WorkoutChallengeAcceptDialog';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFitbit } from '@/hooks/useFitbit';
import { useFriends } from '@/hooks/useFriends';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { coWorkoutService } from '@/services/coWorkoutService';
import { Friend } from '@/services/friendService';
import { CalendarEvent, googleCalendarService } from '@/services/googleCalendarService';
import { Notification, notificationService } from '@/services/notificationService';
import { workoutService } from '@/services/workoutService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { isConnected, isLoading, data, error, refresh, connect: connectFitbit } = useFitbit();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showMotivationResponseModal, setShowMotivationResponseModal] = useState(false);
  const [motivationResponseText, setMotivationResponseText] = useState('');
  const [respondingToUser, setRespondingToUser] = useState<{ id: string; name: string } | null>(null);
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

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
  
  // Manual workout logging states
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutType, setWorkoutType] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutSatisfaction, setWorkoutSatisfaction] = useState('3');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  
  // Challenge accept dialog states
  const [showChallengeAcceptDialog, setShowChallengeAcceptDialog] = useState(false);
  const [selectedChallengeNotification, setSelectedChallengeNotification] = useState<Notification | null>(null);
  
  const { friends } = useFriends();
  const { isAuthenticated: isCalendarConnected } = useGoogleCalendar();

  const onRefresh = React.useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Use Fitbit data if available, otherwise use mock data
  const todayStats = {
    steps: data.activity?.steps || 0,
    stepGoal: 10000,
    calories: data.activity?.calories || 0,
    calorieGoal: 500,
    activeMinutes: data.activity?.activeMinutes || 0,
    activeGoal: 45,
    heartRate: data.heartRate?.restingHeartRate || 0,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSendMotivationResponse = async () => {
    if (!respondingToUser || !motivationResponseText.trim()) {
      Alert.alert('Error', 'Please write a motivational message');
      return;
    }

    setIsSendingResponse(true);
    try {
      const { motivationService } = await import('@/services/motivationService');
      await motivationService.sendMotivation([respondingToUser.id], motivationResponseText.trim());
      
      Alert.alert('Success!', `Your motivation was sent to ${respondingToUser.name}!`);
      
      // Reset state
      setShowMotivationResponseModal(false);
      setMotivationResponseText('');
      setRespondingToUser(null);
    } catch (error: any) {
      console.error('Failed to send motivation:', error);
      Alert.alert('Error', 'Failed to send motivation. Please try again.');
    } finally {
      setIsSendingResponse(false);
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount();
    } catch (error) {
      console.error('Failed to remove notification:', error);
      Alert.alert('Error', 'Failed to remove notification. Please try again.');
    }
  };

  const toggleNotificationExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
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
      
      Alert.alert('Invitations Sent!', `Successfully invited ${friendNames} to your workout.`);
      
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
      
      Alert.alert('Challenges Sent!', `Workout challenge sent to ${friendNames}.`);
      
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

  const handleSaveWorkout = async () => {
    if (!workoutType) {
      Alert.alert('Missing Information', 'Please select a workout type.');
      return;
    }

    if (!workoutDuration || Number(workoutDuration) <= 0) {
      Alert.alert('Missing Information', 'Please enter a valid duration.');
      return;
    }

    setIsSavingWorkout(true);
    try {
      if (!user?.id) throw new Error('Not authenticated');

      await workoutService.addWorkout({
        user_id: user.id,
        started_at: new Date().toISOString(),
        type: workoutType,
        duration_minutes: Number(workoutDuration),
        satisfaction: workoutSatisfaction ? Number(workoutSatisfaction) : null,
        notes: workoutNotes || null,
        source: 'manual',
      });

      Alert.alert('Success', 'Workout logged successfully!');
      
      setShowWorkoutModal(false);
      setWorkoutType('');
      setWorkoutDuration('');
      setWorkoutSatisfaction('3');
      setWorkoutNotes('');
      
      // Refresh data
      await refresh();
    } catch (error: any) {
      console.error('❌ Error saving workout:', error);
      Alert.alert('Error', error.message || 'Failed to save workout. Please try again.');
    } finally {
      setIsSavingWorkout(false);
    }
  };

  const handleFitbitConnect = async () => {
    try {
      console.log('🔵 Dashboard: Connecting to Fitbit...');
      const success = await connectFitbit();
      
      if (success) {
        Alert.alert('Success', 'Connected to Fitbit! Your health data will now sync automatically.');
      } else {
        Alert.alert('Connection Cancelled', 'Fitbit connection was cancelled.');
      }
    } catch (error) {
      console.error('❌ Dashboard: Fitbit connection error:', error);
      Alert.alert('Error', 'Failed to connect to Fitbit. Please try again.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={isLoading} 
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {getGreeting()}, {user?.first_name || 'there'}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ready to make today count? Let's keep up the momentum! 💪
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={async () => {
            setShowNotificationsModal(true);
            setIsLoadingNotifications(true);
            try {
              const notifs = await notificationService.getNotifications();
              setNotifications(notifs);
            } catch (error) {
              console.error('Failed to load notifications:', error);
            } finally {
              setIsLoadingNotifications(false);
            }
          }}
        >
          <Ionicons name="notifications-outline" size={28} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: '#ff3b30' }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Fitbit Connection Banner */}
      {!isConnected && (
        <Card style={styles.connectionBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="link-outline" size={24} color={colors.primary} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.foreground }]}>
                Connect Your Fitbit
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.mutedForeground }]}>
                {Platform.OS === 'web' 
                  ? 'Available on mobile apps (iOS/Android)'
                  : 'Get real-time health data and personalized insights'
                }
              </Text>
            </View>
            {Platform.OS !== 'web' && (
              <TouchableOpacity 
                style={[styles.connectButton, { backgroundColor: colors.primary }]}
                onPress={handleFitbitConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* Today's Progress - Only show when Fitbit is connected */}
      {isConnected && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Progress</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Ionicons name="footsteps" size={20} color={colors.primary} />}
              title="Steps"
              value={todayStats.steps.toLocaleString()}
              subtitle={`Goal: ${todayStats.stepGoal.toLocaleString()}`}
              progress={(todayStats.steps / todayStats.stepGoal) * 100}
              color={colors.primary}
            />
            
            <StatCard
              icon={<Ionicons name="flame" size={20} color={colors.secondary} />}
              title="Calories"
              value={todayStats.calories}
              subtitle={`Goal: ${todayStats.calorieGoal}`}
              progress={(todayStats.calories / todayStats.calorieGoal) * 100}
              color={colors.secondary}
            />
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<Ionicons name="time" size={20} color={colors.primary} />}
              title="Active Minutes"
              value={todayStats.activeMinutes}
              subtitle={`Goal: ${todayStats.activeGoal} min`}
              progress={(todayStats.activeMinutes / todayStats.activeGoal) * 100}
              color={colors.primary}
            />
            
            <StatCard
              icon={<Ionicons name="heart" size={20} color={colors.accent} />}
              title="Heart Rate"
              value={`${todayStats.heartRate} bpm`}
              subtitle="Resting"
              color={colors.accent}
            />
          </View>
        </View>
      )}

      {/* Google Calendar */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calendar</Text>
        <Card style={styles.calendarCard}>
          <GoogleCalendar />
        </Card>
      </View>

      {/* AI Coach Insights */}
      <View style={styles.section}>
        <Card variant="wellness" style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIconContainer, { backgroundColor: colors.secondary }]}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <Text style={[styles.insightTitle, { color: colors.foreground }]}>AI Coach Insights</Text>
          </View>
          <Text style={[styles.insightText, { color: colors.mutedForeground }]}>
            Your consistency with morning workouts is paying off! Sleep quality
            improved with evening yoga.
          </Text>
          <TouchableOpacity style={styles.insightButton} onPress={() => router.push('/(tabs)/chat')}>
            <Text style={[styles.insightButtonText, { color: colors.primary }]}>Let's Chat</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => setShowWorkoutModal(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Log Activity</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]}>
            <Ionicons name="sync-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Sync Data</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickActions, { marginTop: Spacing.md }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleOpenScheduledWorkoutModal}
          >
            <Ionicons name="calendar" size={24} color="#34c759" />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Invite to Workout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => setShowChallengeModal(true)}
          >
            <Ionicons name="flash" size={24} color="#ff3b30" />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Challenge Friend</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Notifications</Text>
              <View style={styles.modalHeaderActions}>
                {notifications.filter(n => !n.read).length > 0 && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await notificationService.markAllAsRead();
                        const updatedNotifs = notifications.map(n => ({ ...n, read: true }));
                        setNotifications(updatedNotifs);
                        await refreshUnreadCount();
                      } catch (error) {
                        console.error('Failed to mark all as read:', error);
                      }
                    }}
                  >
                    <Text style={[styles.markAllRead, { color: colors.tint }]}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            {isLoadingNotifications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: colors.foreground }]}>No notifications</Text>
                <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                  You're all caught up!
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isExpanded = expandedNotifications.has(item.id);
                  const isActionableType = ['scheduled_workout_invitation', 'workout_challenge'].includes(item.type);
                  
                  return (
                    <View
                      style={[
                        styles.notificationItemContainer,
                        { backgroundColor: item.read ? 'transparent' : colors.tint + '10', borderBottomColor: colors.border }
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.notificationItem}
                        onPress={async () => {
                          if (!item.read) {
                            try {
                              await notificationService.markAsRead(item.id);
                              const updatedNotifs = notifications.map(n =>
                                n.id === item.id ? { ...n, read: true } : n
                              );
                              setNotifications(updatedNotifs);
                              await refreshUnreadCount();
                            } catch (error) {
                              console.error('Failed to mark as read:', error);
                            }
                          }
                          
                          // Handle motivation notifications
                          if (item.type === 'motivation_received' && item.data?.motivation_message) {
                            Alert.alert(
                              `Motivation from ${item.data.sender_name}`,
                              item.data.motivation_message,
                              [{ text: 'OK' }]
                            );
                          } else if (item.type === 'motivation_request' && item.data?.requester_id) {
                            Alert.alert(
                              'Motivation Request',
                              `${item.data.requester_name} is requesting motivation. Would you like to send them an encouraging message?`,
                              [
                                { text: 'Later', style: 'cancel' },
                                {
                                  text: 'Send Motivation',
                                  onPress: () => {
                                    setShowNotificationsModal(false);
                                    setRespondingToUser({ id: item.data.requester_id, name: item.data.requester_name });
                                    setShowMotivationResponseModal(true);
                                  }
                                }
                              ]
                            );
                          }
                        }}
                      >
                        <View style={styles.notificationIcon}>
                          {item.type === 'motivation_received' && <Ionicons name="sparkles" size={24} color={colors.tint} />}
                          {item.type === 'motivation_request' && <Ionicons name="hand-left" size={24} color="#ff9500" />}
                          {item.type === 'friend_request' && <Ionicons name="person-add" size={24} color={colors.tint} />}
                          {item.type === 'scheduled_workout_invitation' && <Ionicons name="calendar" size={24} color="#34c759" />}
                          {item.type === 'workout_challenge' && <Ionicons name="flash" size={24} color="#ff3b30" />}
                          {!['motivation_received', 'motivation_request', 'friend_request', 'scheduled_workout_invitation', 'workout_challenge'].includes(item.type) && (
                            <Ionicons name="notifications" size={24} color={colors.tint} />
                          )}
                        </View>
                        <View style={styles.notificationContent}>
                          <Text style={[styles.notificationTitle, { color: colors.foreground }]}>{item.title}</Text>
                          <Text style={[styles.notificationMessage, { color: colors.foreground, opacity: 0.7 }]}>
                            {item.message}
                          </Text>
                          <Text style={[styles.notificationTime, { color: colors.foreground, opacity: 0.5 }]}>
                            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {!item.read && (
                          <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
                        )}
                      </TouchableOpacity>

                      {/* Scheduled Workout Invitation Details */}
                      {item.type === 'scheduled_workout_invitation' && (
                        <View style={styles.notificationActions}>
                          <TouchableOpacity
                            style={[styles.detailsButton, { borderColor: colors.border }]}
                            onPress={() => toggleNotificationExpanded(item.id)}
                          >
                            <Text style={[styles.detailsButtonText, { color: colors.foreground }]}>
                              {isExpanded ? 'Hide Details' : 'View Details'}
                            </Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.foreground} />
                          </TouchableOpacity>
                          
                          {isExpanded && item.data && (
                            <View style={[styles.expandedDetails, { backgroundColor: colors.background }]}>
                              {item.data.event_summary && (
                                <View style={styles.detailRow}>
                                  <Ionicons name="document-text-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                  <Text style={[styles.detailLabel, { color: colors.foreground }]}>Event:</Text>
                                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.data.event_summary}</Text>
                                </View>
                              )}
                              {item.data.event_start && (
                                <View style={styles.detailRow}>
                                  <Ionicons name="calendar-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                  <Text style={[styles.detailLabel, { color: colors.foreground }]}>Start:</Text>
                                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                                    {new Date(item.data.event_start).toLocaleString()}
                                  </Text>
                                </View>
                              )}
                              {item.data.event_location && (
                                <View style={styles.detailRow}>
                                  <Ionicons name="location-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                  <Text style={[styles.detailLabel, { color: colors.foreground }]}>Location:</Text>
                                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.data.event_location}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={[styles.acceptButton, { backgroundColor: '#34c759' }]}
                              onPress={async () => {
                                Alert.alert('Invitation Accepted', "You've accepted the workout invitation!");
                                await handleRemoveNotification(item.id);
                              }}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                              <Text style={styles.actionButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.declineButton, { borderColor: colors.border }]}
                              onPress={() => handleRemoveNotification(item.id)}
                            >
                              <Ionicons name="close" size={16} color={colors.foreground} />
                              <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Workout Challenge Details */}
                      {item.type === 'workout_challenge' && (
                        <View style={styles.notificationActions}>
                          <TouchableOpacity
                            style={[styles.detailsButton, { borderColor: colors.border }]}
                            onPress={() => toggleNotificationExpanded(item.id)}
                          >
                            <Text style={[styles.detailsButtonText, { color: colors.foreground }]}>
                              {isExpanded ? 'Hide Details' : 'View Challenge'}
                            </Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.foreground} />
                          </TouchableOpacity>
                          
                          {isExpanded && item.data && (
                            <View style={[styles.expandedDetails, { backgroundColor: colors.background }]}>
                              <View style={styles.detailRow}>
                                <Ionicons name="barbell-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                <Text style={[styles.detailLabel, { color: colors.foreground }]}>Type:</Text>
                                <Text style={[styles.detailValue, { color: colors.foreground, textTransform: 'capitalize' }]}>
                                  {item.data.workout_form}
                                </Text>
                              </View>
                              {item.data.time_option === 'set' && item.data.workout_time ? (
                                <>
                                  <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                    <Text style={[styles.detailLabel, { color: colors.foreground }]}>When:</Text>
                                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                                      {new Date(item.data.workout_time).toLocaleString()}
                                    </Text>
                                  </View>
                                  <View style={styles.detailRow}>
                                    <Ionicons name="time-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                    <Text style={[styles.detailLabel, { color: colors.foreground }]}>Duration:</Text>
                                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.data.workout_duration} min</Text>
                                  </View>
                                </>
                              ) : (
                                <View style={styles.detailRow}>
                                  <Ionicons name="time-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                  <Text style={[styles.detailLabel, { color: colors.foreground }]}>Timing:</Text>
                                  <Text style={[styles.detailValue, { color: '#ff3b30' }]}>Complete on your own time</Text>
                                </View>
                              )}
                              {item.data.workout_note && (
                                <View style={styles.detailRow}>
                                  <Ionicons name="document-text-outline" size={14} color={colors.foreground} style={{ opacity: 0.6 }} />
                                  <Text style={[styles.detailLabel, { color: colors.foreground }]}>Note:</Text>
                                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.data.workout_note}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={[styles.acceptButton, { backgroundColor: '#ff3b30' }]}
                              onPress={async () => {
                                console.log('🎯 Accept challenge button pressed');
                                console.log('📋 Challenge notification data:', item.data);
                                
                                // Store the notification data
                                const notification = item;
                                
                                // Close notifications modal first
                                setShowNotificationsModal(false);
                                
                                // Wait for modal animation to complete
                                await new Promise(resolve => setTimeout(resolve, 350));
                                
                                // Then set the challenge data and open dialog
                                setSelectedChallengeNotification(notification);
                                setShowChallengeAcceptDialog(true);
                                console.log('✅ Dialog should now be visible');
                              }}
                            >
                              <Ionicons name="flash" size={16} color="#fff" />
                              <Text style={styles.actionButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.declineButton, { borderColor: colors.border }]}
                              onPress={() => handleRemoveNotification(item.id)}
                            >
                              <Ionicons name="close" size={16} color={colors.foreground} />
                              <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Motivation Response Modal */}
      <Modal
        visible={showMotivationResponseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMotivationResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowMotivationResponseModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={[styles.motivationResponseContainer, { backgroundColor: colors.card }]}
              contentContainerStyle={styles.motivationResponseContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Send Motivation</Text>
                <TouchableOpacity onPress={() => setShowMotivationResponseModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.motivationResponseLabel, { color: colors.foreground, opacity: 0.7 }]}>
                Write an encouraging message for {respondingToUser?.name}:
              </Text>

              <TextInput
                style={[styles.motivationResponseInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="You've got this! Keep pushing forward..."
                placeholderTextColor={colors.foreground + '80'}
                value={motivationResponseText}
                onChangeText={setMotivationResponseText}
                multiline
                maxLength={300}
                autoFocus
                numberOfLines={4}
              />

              <Text style={[styles.characterCount, { color: colors.foreground, opacity: 0.5 }]}>
                {motivationResponseText.length}/300
              </Text>

              <TouchableOpacity
                style={[
                  styles.sendMotivationButton,
                  { backgroundColor: colors.tint },
                  (!motivationResponseText.trim() || isSendingResponse) && { opacity: 0.5 }
                ]}
                onPress={handleSendMotivationResponse}
                disabled={!motivationResponseText.trim() || isSendingResponse}
              >
                {isSendingResponse ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.sendMotivationButtonText}>Send Motivation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Scheduled Workout Invitation Modal - Same as feed.tsx */}
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
            style={styles.keyboardAvoidingView}
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

      {/* Challenge Workout Modal - Simplified version for dashboard */}
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
            style={styles.keyboardAvoidingView}
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
                  <>
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

      {/* Manual Workout Logging Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowWorkoutModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowWorkoutModal(false)}>
                  <Ionicons name="close" size={28} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Log Workout
                </Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Workout Type */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Workout Type *</Text>
                  <View style={styles.workoutTypeGrid}>
                    {['Cardio', 'Strength', 'Yoga', 'Pilates', 'Cycling', 'Walking', 'Running', 'HIIT', 'CrossFit', 'Other'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.workoutTypeButton,
                          { borderColor: colors.border, backgroundColor: colors.muted },
                          workoutType === type.toLowerCase() && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setWorkoutType(type.toLowerCase())}
                      >
                        <Text style={[
                          styles.workoutTypeText,
                          { color: colors.foreground },
                          workoutType === type.toLowerCase() && { color: '#fff', fontWeight: '600' }
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Duration */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Duration (minutes) *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    placeholder="e.g., 30"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={workoutDuration}
                    onChangeText={setWorkoutDuration}
                  />
                </View>

                {/* Satisfaction */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>How did it feel?</Text>
                  <View style={styles.satisfactionButtons}>
                    {[
                      { value: '1', label: '1 - Tough' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3 - Okay' },
                      { value: '4', label: '4' },
                      { value: '5', label: '5 - Great' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.satisfactionButton,
                          { borderColor: colors.border, backgroundColor: colors.muted },
                          workoutSatisfaction === option.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setWorkoutSatisfaction(option.value)}
                      >
                        <Text style={[
                          styles.satisfactionText,
                          { color: colors.foreground },
                          workoutSatisfaction === option.value && { color: '#fff', fontWeight: '600' }
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    placeholder="What did you do? Any observations?"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={workoutNotes}
                    onChangeText={setWorkoutNotes}
                  />
                </View>
              </ScrollView>

              {/* Save Button */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.fullWidthButton,
                    { backgroundColor: colors.primary },
                    (!workoutType || !workoutDuration || isSavingWorkout) && styles.buttonDisabled
                  ]}
                  onPress={handleSaveWorkout}
                  disabled={!workoutType || !workoutDuration || isSavingWorkout}
                >
                  {isSavingWorkout ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.fullWidthButtonText}>Save Workout</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Workout Challenge Accept Dialog */}
      {(() => {
        console.log('🔍 Dialog render check:', {
          hasNotification: !!selectedChallengeNotification,
          hasData: !!selectedChallengeNotification?.data,
          dialogVisible: showChallengeAcceptDialog,
          shouldRender: !!(selectedChallengeNotification && selectedChallengeNotification.data && showChallengeAcceptDialog)
        });
        return null;
      })()}
      {selectedChallengeNotification && selectedChallengeNotification.data && showChallengeAcceptDialog && (
        <WorkoutChallengeAcceptDialog
          visible={true}
          onClose={() => {
            console.log('🚪 Dialog onClose called from parent');
            console.trace('onClose call stack');
            setShowChallengeAcceptDialog(false);
            setSelectedChallengeNotification(null);
          }}
          challengeData={{
            challenger_name: selectedChallengeNotification.data.challenger_name || 'Someone',
            workout_form: selectedChallengeNotification.data.workout_form || 'Workout',
            time_option: selectedChallengeNotification.data.time_option || 'flexible',
            workout_time: selectedChallengeNotification.data.workout_time,
            workout_duration: selectedChallengeNotification.data.workout_duration,
            workout_note: selectedChallengeNotification.data.workout_note,
          }}
          onAccept={async (scheduledTime: string, duration: number) => {
            console.log('🎉 onAccept called with:', { scheduledTime, duration });
            try {
              if (!user?.id || !selectedChallengeNotification.data) {
                console.log('❌ Missing user or notification data');
                return;
              }
              
              const challengeId = selectedChallengeNotification.data.challenge_id;
              if (!challengeId) {
                throw new Error('Challenge ID not found in notification');
              }
              
              // Accept the challenge and create calendar event
              await coWorkoutService.acceptWorkoutChallenge(
                challengeId,
                scheduledTime,
                duration
              );

              // Remove the notification
              await handleRemoveNotification(selectedChallengeNotification.id);
              
              Alert.alert('Success', '✅ Challenge accepted! Added to your calendar.');
              setShowChallengeAcceptDialog(false);
              setSelectedChallengeNotification(null);
            } catch (error: any) {
              console.error('❌ Error accepting challenge:', error);
              Alert.alert('Error', error.message || 'Failed to accept challenge. Please try again.');
              throw error;
            }
          }}
        />
      )}
    </ScrollView>
  );
}

// Note: Dynamic colors are applied inline using the colors object
// Static styles use design tokens from the theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing['2xl'],
  },
  greeting: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.sm,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.md,
  },
  calendarCard: {
    padding: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  workoutCard: {
    marginBottom: Spacing.md,
  },
  workoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 2,
  },
  workoutTime: {
    fontSize: Typography.fontSizes.sm,
  },
  insightCard: {
    // Card styling handled by Card component
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  insightTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  insightText: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.sm,
    marginBottom: Spacing.md,
  },
  insightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  insightButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginRight: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  actionText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  connectionBanner: {
    marginBottom: Spacing.xl,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSizes.sm,
  },
  connectButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  headerLeft: {
    flex: 1,
  },
  notificationButton: {
    position: 'relative',
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifications: {
    flex: 1,
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
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  motivationResponseContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    marginTop: 'auto',
    maxHeight: '70%',
  },
  motivationResponseContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  motivationResponseLabel: {
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  motivationResponseInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.xs,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  sendMotivationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  sendMotivationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    width: '100%',
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
  modalScroll: {
    maxHeight: '60%',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
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
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  friendsList: {
    gap: Spacing.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    marginLeft: 'auto',
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
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
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
  notificationItemContainer: {
    borderBottomWidth: 1,
  },
  notificationActions: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandedDetails: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  workoutTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  workoutTypeButton: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  workoutTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  satisfactionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  satisfactionButton: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  satisfactionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
});
