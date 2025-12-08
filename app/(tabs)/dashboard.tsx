import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFitbit } from '@/hooks/useFitbit';
import { notificationService, Notification } from '@/services/notificationService';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { GoogleCalendar } from '@/components/GoogleCalendar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { isConnected, isLoading, data, error, refresh } = useFitbit();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showMotivationResponseModal, setShowMotivationResponseModal] = useState(false);
  const [motivationResponseText, setMotivationResponseText] = useState('');
  const [respondingToUser, setRespondingToUser] = useState<{ id: string; name: string } | null>(null);
  const [isSendingResponse, setIsSendingResponse] = useState(false);

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

  const upcomingWorkouts = [
    {
      id: 1,
      time: '6:00 PM',
      title: 'Evening Yoga Flow',
      duration: '30 min',
      type: 'yoga',
    },
    {
      id: 2,
      time: 'Tomorrow 7:00 AM',
      title: 'Morning Cardio',
      duration: '45 min',
      type: 'cardio',
    },
  ];

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
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* Today's Progress */}
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

      {/* Google Calendar */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calendar</Text>
        <Card style={styles.calendarCard}>
          <GoogleCalendar />
        </Card>
      </View>

      {/* Up Next */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Up Next</Text>
        
        {upcomingWorkouts.map((workout) => (
          <Card key={workout.id} style={styles.workoutCard}>
            <View style={styles.workoutContent}>
              <View style={[styles.workoutIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="fitness" size={20} color={colors.primary} />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={[styles.workoutTitle, { color: colors.foreground }]}>{workout.title}</Text>
                <Text style={[styles.workoutTime, { color: colors.mutedForeground }]}>
                  {workout.time} • {workout.duration}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </Card>
        ))}
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
          <TouchableOpacity style={styles.insightButton}>
            <Text style={[styles.insightButtonText, { color: colors.primary }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Log Activity</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]}>
            <Ionicons name="sync-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Sync Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Schedule</Text>
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
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.notificationItem,
                      { backgroundColor: item.read ? 'transparent' : colors.tint + '10', borderBottomColor: colors.border }
                    ]}
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
                        // Show alert with option to send motivation back
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
                      {item.type === 'motivation_received' && (
                        <Ionicons name="sparkles" size={24} color={colors.tint} />
                      )}
                      {item.type === 'motivation_request' && (
                        <Ionicons name="hand-left" size={24} color="#ff9500" />
                      )}
                      {item.type === 'friend_request' && (
                        <Ionicons name="person-add" size={24} color={colors.tint} />
                      )}
                      {!['motivation_received', 'motivation_request', 'friend_request'].includes(item.type) && (
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
                )}
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
});
