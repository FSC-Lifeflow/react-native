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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/Card';
import { useFriends, useFriendRequests, useUserSearch, useSendFriendRequest } from '@/hooks/useFriends';
import { Friend, FriendRequest, UserSearchResult } from '@/services/friendService';

type TabType = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const { friends, friendCount, isLoading: isLoadingFriends, refetch: refetchFriends, unfriend, isUnfriending } = useFriends();
  const {
    receivedRequests,
    sentRequests,
    pendingCount,
    isLoading: isLoadingRequests,
    refetchReceived,
    refetchSent,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    isAccepting,
    isRejecting,
    isCanceling,
  } = useFriendRequests();
  const { users, isLoading: isSearching } = useUserSearch(searchQuery);
  const { sendRequest, isSending } = useSendFriendRequest();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'friends') {
      await refetchFriends();
    } else if (activeTab === 'requests') {
      await Promise.all([refetchReceived(), refetchSent()]);
    }
    setRefreshing(false);
  };

  const handleUnfriend = (friendId: string, friendName: string) => {
    const confirmUnfriend = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to unfriend ${friendName}?`)
      : Alert.alert(
          'Unfriend',
          `Are you sure you want to unfriend ${friendName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unfriend', style: 'destructive', onPress: () => unfriend(friendId) },
          ]
        );

    if (Platform.OS === 'web' && confirmUnfriend) {
      unfriend(friendId);
    }
  };

  const renderTabButton = (tab: TabType, label: string, count?: number) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { ...styles.activeTab, borderBottomColor: colors.tint },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[
          styles.tabText,
          { color: activeTab === tab ? colors.tint : colors.text },
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.tint }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFriendItem = (friend: Friend) => (
    <Card key={friend.id} style={styles.friendCard}>
      <View style={styles.friendContent}>
        <View style={styles.friendInfo}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={24} color={colors.text} />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: colors.text }]}>
              {friend.first_name} {friend.last_name}
            </Text>
            <Text style={[styles.friendUsername, { color: colors.subtext }]}>
              @{friend.username}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.unfriendButton]}
          onPress={() => handleUnfriend(friend.id, `${friend.first_name} ${friend.last_name}`)}
          disabled={isUnfriending}
        >
          <Ionicons name="person-remove" size={20} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderRequestItem = (request: FriendRequest, type: 'received' | 'sent') => {
    const user = type === 'received' ? request.sender : request.receiver;
    if (!user) return null;

    return (
      <Card key={request.id} style={styles.friendCard}>
        <View style={styles.friendContent}>
          <View style={styles.friendInfo}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={24} color={colors.foreground} />
              </View>
            )}
            <View style={styles.friendDetails}>
              <Text style={[styles.friendName, { color: colors.foreground }]}>
                {user.first_name} {user.last_name}
              </Text>
              <Text style={[styles.friendUsername, { color: colors.foreground, opacity: 0.6 }]}>
                @{user.username}
              </Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            {type === 'received' ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.tint }]}
                  onPress={() => acceptRequest(request.id)}
                  disabled={isAccepting}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectRequest(request.id)}
                  disabled={isRejecting}
                >
                  <Ionicons name="close" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => cancelRequest(request.id)}
                disabled={isCanceling}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderSearchResult = (user: UserSearchResult) => (
    <Card key={user.id} style={styles.friendCard}>
      <View style={styles.friendContent}>
        <View style={styles.friendInfo}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={24} color={colors.text} />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: colors.text }]}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={[styles.friendUsername, { color: colors.subtext }]}>
              @{user.username}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => sendRequest(user.id)}
          disabled={isSending}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Friends</Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{friendCount}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Friends</Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ff9500' }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Pending</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {renderTabButton('friends', 'Friends', friendCount)}
        {renderTabButton('requests', 'Requests', pendingCount)}
        {renderTabButton('search', 'Search')}
      </View>

      {/* Search Input (visible in search tab) */}
      {activeTab === 'search' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name or username..."
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {activeTab === 'friends' && (
          <View style={styles.listContainer}>
            {isLoadingFriends ? (
              <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
            ) : friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>No friends yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
                  Search for users to add friends
                </Text>
              </View>
            ) : (
              friends.map(renderFriendItem)
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <View style={styles.listContainer}>
            {isLoadingRequests ? (
              <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
            ) : (
              <>
                {receivedRequests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Received Requests</Text>
                    {receivedRequests.map((request) => renderRequestItem(request, 'received'))}
                  </View>
                )}
                {sentRequests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Sent Requests</Text>
                    {sentRequests.map((request) => renderRequestItem(request, 'sent'))}
                  </View>
                )}
                {receivedRequests.length === 0 && sentRequests.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="mail-outline" size={64} color={colors.subtext} />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>No pending requests</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {activeTab === 'search' && (
          <View style={styles.listContainer}>
            {isSearching ? (
              <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
            ) : searchQuery.trim().length < 2 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>Search for friends</Text>
                <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
                  Enter at least 2 characters to search
                </Text>
              </View>
            ) : users.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={64} color={colors.subtext} />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>No users found</Text>
              </View>
            ) : (
              users.map(renderSearchResult)
            )}
          </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
  },
  headerStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    padding: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  friendCard: {
    marginBottom: Spacing.sm,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendUsername: {
    ...Typography.caption,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  rejectButton: {
    backgroundColor: '#ffebee',
  },
  unfriendButton: {
    backgroundColor: '#ffebee',
  },
  addButton: {
    // backgroundColor set dynamically
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: Spacing.md,
    width: 'auto',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  loader: {
    marginTop: Spacing.xl,
  },
});
