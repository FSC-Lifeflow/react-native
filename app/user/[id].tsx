import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/Card';
import { userService, type FriendProfileData } from '@/services/userService';
import { friendService, type Friend } from '@/services/friendService';
import { supabase } from '@/lib/supabase';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<FriendProfileData | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  // Fetch friend's profile data and check relationship status
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('Not authenticated');
        }

        // Check if blocked
        const { data: blocks } = await supabase
          .from('user_blocks')
          .select('*')
          .or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${id}),and(blocker_id.eq.${id},blocked_id.eq.${currentUser.id})`);

        if (blocks && blocks.length > 0) {
          const block = blocks[0];
          if (block.blocker_id === currentUser.id) {
            setIsBlocked(true);
          } else {
            setBlockedBy(true);
          }
          setLoading(false);
          return;
        }

        // Check friendship status
        const { data: friendshipData } = await supabase
          .from('friend_requests')
          .select('status, sender_id, receiver_id')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`)
          .maybeSingle();

        if (friendshipData) {
          if (friendshipData.status === 'accepted') {
            setIsFriend(true);
            setFriendshipStatus('accepted');
          } else if (friendshipData.status === 'pending') {
            setFriendshipStatus('pending');
          }
        }

        const data = await userService.getFriendProfile(id);
        setProfileData(data);
      } catch (error) {
        console.error('Failed to fetch friend profile:', error);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // Fetch friend's friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!id) return;
      
      setLoadingFriends(true);
      try {
        const data = await friendService.getFriendsOfUser(id);
        setFriends(data);
      } catch (error) {
        console.error('Failed to fetch friend\'s friends:', error);
      } finally {
        setLoadingFriends(false);
      }
    };

    if (id && isFriend) {
      fetchFriends();
    }
  }, [id, isFriend]);

  // Helper function to format fitness level
  const formatFitnessLevel = (level?: string) => {
    if (!level) return 'Not specified';
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  // Helper function to format goals
  const formatGoal = (goal?: string) => {
    if (!goal) return 'Not specified';
    return goal.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Helper function to format exercise preferences
  const formatExercisePreference = (pref?: string) => {
    if (!pref) return 'Not specified';
    return pref.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Handle sending friend request
  const handleSendFriendRequest = async () => {
    if (!id) return;
    
    setSendingRequest(true);
    try {
      await friendService.sendFriendRequest(id);
      Alert.alert('Success', 'Friend request sent!');
      setFriendshipStatus('pending');
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Show blocked message
  if (blockedBy) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.messageContainer}>
          <Card style={styles.messageCard}>
            <Ionicons name="ban" size={64} color={colors.destructive} />
            <Text style={[styles.messageTitle, { color: colors.foreground }]}>Access Restricted</Text>
            <Text style={[styles.messageText, { color: colors.mutedForeground }]}>
              This user has restricted access to their profile.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  if (isBlocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.messageContainer}>
          <Card style={styles.messageCard}>
            <Ionicons name="ban" size={64} color={colors.mutedForeground} />
            <Text style={[styles.messageTitle, { color: colors.foreground }]}>User Blocked</Text>
            <Text style={[styles.messageText, { color: colors.mutedForeground }]}>
              You have blocked this user.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.messageContainer}>
          <Card style={styles.messageCard}>
            <Text style={[styles.messageText, { color: colors.mutedForeground }]}>
              Profile not found
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {profileData.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                <Ionicons name="person" size={40} color={colors.mutedForeground} />
              </View>
            )}
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profileData.first_name} {profileData.last_name}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>
              @{profileData.username}
            </Text>
          </View>

          {/* Action Button */}
          {!isFriend && friendshipStatus === 'none' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleSendFriendRequest}
              disabled={sendingRequest}
            >
              {sendingRequest ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                    Add Friend
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {friendshipStatus === 'pending' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
              <Ionicons name="time" size={16} color={colors.mutedForeground} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                Friend Request Pending
              </Text>
            </View>
          )}

          {isFriend && (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={[styles.statusText, { color: '#fff' }]}>Friends</Text>
            </View>
          )}
        </Card>

        {/* Friends Count */}
        {isFriend && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Friends</Text>
            </View>
            {loadingFriends ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.sectionValue, { color: colors.foreground }]}>
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </Text>
            )}
          </Card>
        )}

        {/* Fitness Information */}
        {isFriend && (profileData.fitness_level || profileData.primary_goals || profileData.exercise_preferences) && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fitness Profile</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Fitness Level</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatFitnessLevel(profileData.fitness_level)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Primary Goals</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatGoal(profileData.primary_goals)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Exercise Preferences</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatExercisePreference(profileData.exercise_preferences)}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  messageCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  messageTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  messageText: {
    fontSize: Typography.fontSizes.base,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  profileCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: Typography.fontSizes.base,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  sectionValue: {
    fontSize: Typography.fontSizes.base,
  },
  infoItem: {
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
  },
});
