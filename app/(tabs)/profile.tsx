import { Card } from '@/components/ui/Card';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/authService';
import { friendService, type BlockedUser } from '@/services/friendService';
import { fitbitService } from '@/services/fitbitService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
  });
  
  // Fitness preferences state
  const [fitnessPreferences, setFitnessPreferences] = useState({
    fitness_level: '',
    primary_goals: '',
    exercise_preferences: '',
    weekly_frequency: '',
    session_duration: '',
    equipment_access: '',
    physical_limitations: '',
  });
  const [showPicker, setShowPicker] = useState<string | null>(null);
  
  // Stats state
  const [stats, setStats] = useState({
    friends: 0,
    workouts: 0,
  });
  
  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);

  // Fetch user fitness preferences and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch fitness preferences
        const userData = await authService.getCurrentUser();
        if (userData) {
          setFitnessPreferences({
            fitness_level: userData.fitness_level || '',
            primary_goals: userData.primary_goals || '',
            exercise_preferences: userData.exercise_preferences || '',
            weekly_frequency: userData.weekly_frequency || '',
            session_duration: userData.session_duration || '',
            equipment_access: userData.equipment_access || '',
            physical_limitations: userData.physical_limitations || '',
          });
        }

        // Fetch friends count
        try {
          const friends = await friendService.getFriends();
          setStats(prev => ({ ...prev, friends: friends.length }));
        } catch (error) {
          console.error('Failed to fetch friends:', error);
        }

        // Fetch workouts count from Fitbit
        try {
          const activities = await fitbitService.getActivities();
          if (activities?.summary?.activityCalories) {
            // Count activities that burned calories (indicating a workout)
            setStats(prev => ({ ...prev, workouts: activities.summary.activityCalories > 0 ? 1 : 0 }));
          }
        } catch (error) {
          console.error('Failed to fetch workouts:', error);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [user?.id]);

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

  const handleSaveFitnessPreferences = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await authService.updateUserProfile(user?.id, fitnessPreferences);
      await refreshUser();
      Alert.alert('Success', 'Fitness preferences updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update fitness preferences');
    } finally {
      setLoading(false);
    }
  };

  const fitnessOptions = {
    fitness_level: [
      { label: 'Beginner', value: 'beginner' },
      { label: 'Intermediate', value: 'intermediate' },
      { label: 'Advanced', value: 'advanced' },
    ],
    primary_goals: [
      { label: 'Weight Loss', value: 'weight-loss' },
      { label: 'Muscle Gain', value: 'muscle-gain' },
      { label: 'Endurance', value: 'endurance' },
      { label: 'Flexibility', value: 'flexibility' },
      { label: 'General Health', value: 'general-health' },
    ],
    exercise_preferences: [
      { label: 'Strength Training', value: 'strength-training' },
      { label: 'Cardio', value: 'cardio' },
      { label: 'Yoga', value: 'yoga' },
      { label: 'Pilates', value: 'pilates' },
      { label: 'HIIT', value: 'hiit' },
      { label: 'Sports', value: 'sports' },
      { label: 'Outdoor Activities', value: 'outdoor' },
      { label: 'Strength + Cardio', value: 'strength-cardio' },
    ],
    weekly_frequency: [
      { label: '2-3 days', value: '2-3-days' },
      { label: '4-5 days', value: '4-5-days' },
      { label: '6-7 days', value: '6-7-days' },
    ],
    session_duration: [
      { label: '15-30 min', value: '15-30-min' },
      { label: '30-45 min', value: '30-45-min' },
      { label: '45-60 min', value: '45-60-min' },
      { label: '60+ min', value: '60-plus-min' },
    ],
    equipment_access: [
      { label: 'Home (bodyweight)', value: 'home-bodyweight' },
      { label: 'Home (basic equipment)', value: 'home-basic' },
      { label: 'Full gym', value: 'full-gym' },
      { label: 'Outdoor spaces', value: 'outdoor' },
    ],
  };

  const statsDisplay = [
    { label: 'Workouts', value: stats.workouts.toString(), icon: 'fitness' },
    { label: 'Friends', value: stats.friends.toString(), icon: 'people' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
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
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={[styles.editButtonText, { color: '#fff' }]}>Edit Profile</Text>
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
        {statsDisplay.map((stat, index) => (
          <Card key={index} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {/* Fitness Preferences */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fitness Preferences</Text>
        </View>

        {/* Fitness Level */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Fitness Level</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('fitness_level')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.fitness_level ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.fitness_level 
                ? fitnessOptions.fitness_level.find(o => o.value === fitnessPreferences.fitness_level)?.label 
                : 'Select fitness level'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Primary Goals */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Primary Goals</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('primary_goals')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.primary_goals ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.primary_goals 
                ? fitnessOptions.primary_goals.find(o => o.value === fitnessPreferences.primary_goals)?.label 
                : 'Select primary goals'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Exercise Preferences */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Exercise Preferences</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('exercise_preferences')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.exercise_preferences ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.exercise_preferences 
                ? fitnessOptions.exercise_preferences.find(o => o.value === fitnessPreferences.exercise_preferences)?.label 
                : 'Select exercise preferences'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Weekly Frequency */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Weekly Frequency</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('weekly_frequency')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.weekly_frequency ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.weekly_frequency 
                ? fitnessOptions.weekly_frequency.find(o => o.value === fitnessPreferences.weekly_frequency)?.label 
                : 'Select weekly frequency'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Session Duration */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Session Duration</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('session_duration')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.session_duration ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.session_duration 
                ? fitnessOptions.session_duration.find(o => o.value === fitnessPreferences.session_duration)?.label 
                : 'Select session duration'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Equipment Access */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Equipment Access</Text>
          <TouchableOpacity
            style={[styles.preferenceSelector, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={() => setShowPicker('equipment_access')}
          >
            <Text style={[styles.preferenceSelectorText, { color: fitnessPreferences.equipment_access ? colors.foreground : colors.mutedForeground }]}>
              {fitnessPreferences.equipment_access 
                ? fitnessOptions.equipment_access.find(o => o.value === fitnessPreferences.equipment_access)?.label 
                : 'Select equipment access'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Physical Limitations */}
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Physical Limitations</Text>
          <TextInput
            style={[styles.limitationsInput, { 
              borderColor: colors.border, 
              backgroundColor: colors.muted,
              color: colors.foreground 
            }]}
            placeholderTextColor={colors.mutedForeground}
            value={fitnessPreferences.physical_limitations}
            onChangeText={(text) => setFitnessPreferences({ ...fitnessPreferences, physical_limitations: text })}
            placeholder="Describe any physical limitations..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.savePreferencesButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveFitnessPreferences}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={[styles.savePreferencesButtonText, { color: colors.primaryForeground }]}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </Card>

      {/* Blocked Users Section */}
      <Card style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={async () => {
            if (!showBlockedUsers) {
              setLoadingBlockedUsers(true);
              try {
                const blocked = await friendService.getBlockedUsers();
                setBlockedUsers(blocked);
              } catch (error) {
                console.error('Failed to load blocked users:', error);
                Alert.alert('Error', 'Failed to load blocked users');
              } finally {
                setLoadingBlockedUsers(false);
              }
            }
            setShowBlockedUsers(!showBlockedUsers);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="ban" size={20} color={colors.destructive} style={{ marginRight: Spacing.sm }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Blocked Users</Text>
          </View>
          <Ionicons 
            name={showBlockedUsers ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.mutedForeground} 
          />
        </TouchableOpacity>

        {showBlockedUsers && (
          <View style={{ marginTop: Spacing.md }}>
            {loadingBlockedUsers ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : blockedUsers.length > 0 ? (
              blockedUsers.map((blockedUser) => (
                <View 
                  key={blockedUser.id} 
                  style={[
                    styles.blockedUserItem,
                    { borderBottomColor: colors.border }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.blockedUserName, { color: colors.foreground }]}>
                      {blockedUser.user.first_name} {blockedUser.user.last_name}
                    </Text>
                    <Text style={[styles.blockedUserUsername, { color: colors.mutedForeground }]}>
                      @{blockedUser.user.username}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.unblockButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      Alert.alert(
                        'Unblock User',
                        `Are you sure you want to unblock ${blockedUser.user.first_name} ${blockedUser.user.last_name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Unblock',
                            onPress: async () => {
                              try {
                                await friendService.unblockUser(blockedUser.blocked_id);
                                setBlockedUsers(prev => prev.filter(u => u.id !== blockedUser.id));
                                Alert.alert('Success', 'User unblocked successfully');
                              } catch (error) {
                                console.error('Failed to unblock user:', error);
                                Alert.alert('Error', 'Failed to unblock user');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.unblockButtonText, { color: colors.primaryForeground }]}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <Ionicons name="people" size={40} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No blocked users</Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Picker Modal */}
      <Modal
        visible={showPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Select {showPicker?.replace(/_/g, ' ')}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {showPicker && fitnessOptions[showPicker as keyof typeof fitnessOptions]?.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    fitnessPreferences[showPicker as keyof typeof fitnessPreferences] === option.value && 
                    { backgroundColor: colors.primary + '10' }
                  ]}
                  onPress={() => {
                    setFitnessPreferences({ ...fitnessPreferences, [showPicker]: option.value });
                    setShowPicker(null);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.foreground },
                    fitnessPreferences[showPicker as keyof typeof fitnessPreferences] === option.value && 
                    { fontWeight: '600', color: colors.primary }
                  ]}>
                    {option.label}
                  </Text>
                  {fitnessPreferences[showPicker as keyof typeof fitnessPreferences] === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  preferenceItem: {
    marginBottom: Spacing.lg,
  },
  preferenceLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  preferenceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  preferenceSelectorText: {
    fontSize: Typography.fontSizes.base,
    flex: 1,
  },
  limitationsInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.base,
    minHeight: 80,
  },
  savePreferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  savePreferencesButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'capitalize',
  },
  optionsList: {
    padding: Spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: Typography.fontSizes.base,
    flex: 1,
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  blockedUserName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  blockedUserUsername: {
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
  },
  unblockButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  unblockButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.sm,
  },
});
