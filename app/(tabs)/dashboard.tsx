import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useFitbit } from '@/hooks/useFitbit';
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
        <View>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {getGreeting()}, {user?.first_name || 'there'}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ready to make today count? Let's keep up the momentum! 💪
          </Text>
        </View>
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
});
