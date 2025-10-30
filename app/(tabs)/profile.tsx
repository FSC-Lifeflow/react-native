import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
  });

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload image to Supabase storage
        Alert.alert('Coming Soon', 'Avatar upload will be implemented in the next phase');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await authService.updateUserProfile(user.id, formData);
      await refreshUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      username: user?.username || '',
    });
    setIsEditing(false);
  };

  const stats = [
    { label: 'Workouts', value: '24', icon: 'fitness' },
    { label: 'Streak', value: '7 days', icon: 'flame' },
    { label: 'Friends', value: '12', icon: 'people' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                <Ionicons name="person" size={40} color={colors.mutedForeground} />
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {!isEditing ? (
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user?.username || 'username'}</Text>
              <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
            </View>
          ) : (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.border, 
                    backgroundColor: colors.muted,
                    color: colors.foreground 
                  }]}
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.first_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, first_name: text })
                  }
                  placeholder="First name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Last Name</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.border, 
                    backgroundColor: colors.muted,
                    color: colors.foreground 
                  }]}
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.last_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, last_name: text })
                  }
                  placeholder="Last name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.border, 
                    backgroundColor: colors.muted,
                    color: colors.foreground 
                  }]}
                  placeholderTextColor={colors.mutedForeground}
                  value={formData.username}
                  onChangeText={(text) =>
                    setFormData({ ...formData, username: text })
                  }
                  placeholder="Username"
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}
        </View>

        {!isEditing ? (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary + '10' }]}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.muted }]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <Card key={index} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {/* Fitness Goals */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fitness Goals</Text>
          <TouchableOpacity>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.goalItem, { borderBottomColor: colors.border }]}>
          <Ionicons name="trophy-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.goalText, { color: colors.foreground }]}>Complete 5 workouts per week</Text>
        </View>
        <View style={[styles.goalItem, { borderBottomColor: colors.border }]}>
          <Ionicons name="footsteps-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.goalText, { color: colors.foreground }]}>Walk 10,000 steps daily</Text>
        </View>
        <View style={[styles.goalItem, { borderBottomColor: colors.border }]}>
          <Ionicons name="moon-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.goalText, { color: colors.foreground }]}>Get 8 hours of sleep</Text>
        </View>
      </Card>

      {/* Activity History */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.activityItem, { borderBottomColor: colors.border }]}>
          <View style={[styles.activityIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityTitle, { color: colors.foreground }]}>Morning Cardio</Text>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>Today at 7:00 AM • 45 min</Text>
          </View>
          <Text style={[styles.activityCalories, { color: colors.secondary }]}>320 cal</Text>
        </View>
        <View style={[styles.activityItem, { borderBottomColor: colors.border }]}>
          <View style={[styles.activityIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="walk" size={20} color={colors.primary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityTitle, { color: colors.foreground }]}>Evening Walk</Text>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>Yesterday at 6:30 PM • 30 min</Text>
          </View>
          <Text style={[styles.activityCalories, { color: colors.secondary }]}>150 cal</Text>
        </View>
      </Card>
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
  profileCard: {
    marginBottom: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: Typography.fontSizes.base,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSizes.sm,
  },
  editForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.base,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  editButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    // Background color applied inline
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  saveButton: {
    // Background color applied inline
  },
  saveButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  viewAll: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  goalText: {
    fontSize: Typography.fontSizes.sm,
    marginLeft: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: Typography.fontSizes.xs,
  },
  activityCalories: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
});
