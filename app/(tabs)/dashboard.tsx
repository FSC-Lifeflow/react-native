import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Mock data - will be replaced with real data from Fitbit/Health APIs
  const todayStats = {
    steps: 7842,
    stepGoal: 10000,
    calories: 320,
    calorieGoal: 500,
    activeMinutes: 25,
    activeGoal: 45,
    heartRate: 72,
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
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.first_name || 'there'}!
          </Text>
          <Text style={styles.subtitle}>
            Ready to make today count? Let's keep up the momentum! 💪
          </Text>
        </View>
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Ionicons name="footsteps" size={20} color="#007AFF" />}
            title="Steps"
            value={todayStats.steps.toLocaleString()}
            subtitle={`Goal: ${todayStats.stepGoal.toLocaleString()}`}
            progress={(todayStats.steps / todayStats.stepGoal) * 100}
            color="#007AFF"
          />
          
          <StatCard
            icon={<Ionicons name="flame" size={20} color="#FF3B30" />}
            title="Calories"
            value={todayStats.calories}
            subtitle={`Goal: ${todayStats.calorieGoal}`}
            progress={(todayStats.calories / todayStats.calorieGoal) * 100}
            color="#FF3B30"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Ionicons name="time" size={20} color="#34C759" />}
            title="Active Minutes"
            value={todayStats.activeMinutes}
            subtitle={`Goal: ${todayStats.activeGoal} min`}
            progress={(todayStats.activeMinutes / todayStats.activeGoal) * 100}
            color="#34C759"
          />
          
          <StatCard
            icon={<Ionicons name="heart" size={20} color="#FF2D55" />}
            title="Heart Rate"
            value={`${todayStats.heartRate} bpm`}
            subtitle="Resting"
            color="#FF2D55"
          />
        </View>
      </View>

      {/* Up Next */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Up Next</Text>
        
        {upcomingWorkouts.map((workout) => (
          <Card key={workout.id} style={styles.workoutCard}>
            <View style={styles.workoutContent}>
              <View style={[styles.workoutIcon, { backgroundColor: '#007AFF20' }]}>
                <Ionicons name="fitness" size={20} color="#007AFF" />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                <Text style={styles.workoutTime}>
                  {workout.time} • {workout.duration}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </Card>
        ))}
      </View>

      {/* AI Coach Insights */}
      <View style={styles.section}>
        <Card style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconContainer}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <Text style={styles.insightTitle}>AI Coach Insights</Text>
          </View>
          <Text style={styles.insightText}>
            Your consistency with morning workouts is paying off! Sleep quality
            improved with evening yoga.
          </Text>
          <TouchableOpacity style={styles.insightButton}>
            <Text style={styles.insightButtonText}>View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Log Activity</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Sync Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  workoutCard: {
    marginBottom: 12,
  },
  workoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  workoutTime: {
    fontSize: 14,
    color: '#666',
  },
  insightCard: {
    backgroundColor: '#fff',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  insightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  insightButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
    textAlign: 'center',
  },
});
