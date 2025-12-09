import { Card } from '@/components/ui/Card';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import { Friend } from '@/services/friendService';
import { ChatRoomWithDetails, messageService } from '@/services/messageService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

export default function MessagesListScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { friends } = useFriends();

  const [chatRooms, setChatRooms] = useState<ChatRoomWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  useEffect(() => {
    const subscription = messageService.subscribeToChatRooms(() => {
      loadChatRooms();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadChatRooms = async () => {
    try {
      setIsLoading(true);
      const rooms = await messageService.getUserChatRooms();
      setChatRooms(rooms);
    } catch (error: any) {
      console.error('Error loading chat rooms:', error);
      Alert.alert('Error', 'Failed to load chat rooms. Please check if the database is set up correctly.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  const handleStartNewChat = async () => {
    if (isGroupChat) {
      if (selectedMembers.length < 2) {
        Alert.alert('Error', 'Please select at least 2 members for a group chat');
        return;
      }
      if (!groupName.trim()) {
        Alert.alert('Error', 'Please enter a group name');
        return;
      }

      try {
        setIsCreatingChat(true);
        
        const memberIds = selectedMembers.map(m => m.id);
        const chatRoom = await messageService.createGroupChat(groupName.trim(), memberIds);
        
        await loadChatRooms();
        
        setShowNewChatModal(false);
        setSelectedMembers([]);
        setGroupName('');
        setIsGroupChat(false);
        
        router.push(`/messages/${chatRoom.id}`);
        
        Alert.alert('Success', `Group chat "${groupName}" created`);
      } catch (error: any) {
        console.error('Error creating group chat:', error);
        Alert.alert('Error', 'Failed to create group chat. Please try again.');
      } finally {
        setIsCreatingChat(false);
      }
    } else {
      if (!selectedFriend) return;

      try {
        setIsCreatingChat(true);
        
        const chatRoomId = await messageService.getOrCreateDirectChat(selectedFriend.id);
        
        await loadChatRooms();
        
        setShowNewChatModal(false);
        setSelectedFriend(null);
        
        router.push(`/messages/${chatRoomId}`);
      } catch (error: any) {
        console.error('Error starting chat:', error);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      } finally {
        setIsCreatingChat(false);
      }
    }
  };

  const toggleMemberSelection = (friend: Friend) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
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

  const filteredRooms = chatRooms.filter(room =>
    room.chat_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatRoom = (room: ChatRoomWithDetails) => (
    <TouchableOpacity
      key={room.chat_room_id}
      onPress={() => router.push(`/messages/${room.chat_room_id}`)}
    >
      <Card style={styles.chatCard}>
        <View style={styles.chatContent}>
          <View style={styles.chatInfo}>
            {room.avatar_url ? (
              <Image source={{ uri: room.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons 
                  name={room.chat_type === 'group' ? 'people' : 'person'} 
                  size={24} 
                  color={colors.foreground} 
                />
              </View>
            )}
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <Text style={[styles.chatName, { color: colors.foreground }]} numberOfLines={1}>
                  {room.chat_name}
                </Text>
                {room.last_message_time && (
                  <Text style={[styles.chatTime, { color: colors.foreground, opacity: 0.6 }]}>
                    {formatTimeAgo(room.last_message_time)}
                  </Text>
                )}
              </View>
              {room.last_message && (
                <Text style={[styles.lastMessage, { color: colors.foreground, opacity: 0.7 }]} numberOfLines={1}>
                  {room.last_message}
                </Text>
              )}
            </View>
          </View>
          {room.unread_count > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.unreadText}>
                {room.unread_count > 9 ? '9+' : room.unread_count}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
          </View>
          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowNewChatModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.foreground} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search chats..."
            placeholderTextColor={colors.foreground + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat Rooms List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
        ) : filteredRooms.length === 0 && searchQuery === '' ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No chats yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
              Start a conversation with your friends
            </Text>
            <TouchableOpacity
              style={[styles.startChatButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowNewChatModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.startChatText}>Start a Chat</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No results found</Text>
            <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <View style={styles.chatsList}>
            {filteredRooms.map(renderChatRoom)}
          </View>
        )}
      </ScrollView>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowNewChatModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <Ionicons name="close" size={28} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Chat</Text>
              <TouchableOpacity
                onPress={handleStartNewChat}
                disabled={isCreatingChat || (!selectedFriend && !isGroupChat) || (isGroupChat && (selectedMembers.length < 2 || !groupName.trim()))}
              >
                <Text
                  style={[
                    styles.createButton,
                    { color: colors.tint },
                    (isCreatingChat || (!selectedFriend && !isGroupChat) || (isGroupChat && (selectedMembers.length < 2 || !groupName.trim()))) && styles.createButtonDisabled,
                  ]}
                >
                  {isCreatingChat ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Chat Type Toggle */}
              <View style={styles.chatTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.chatTypeButton,
                    !isGroupChat && { backgroundColor: colors.tint, borderColor: colors.tint }
                  ]}
                  onPress={() => {
                    setIsGroupChat(false);
                    setSelectedMembers([]);
                    setGroupName('');
                  }}
                >
                  <Ionicons name="person" size={20} color={!isGroupChat ? '#fff' : colors.foreground} />
                  <Text style={[styles.chatTypeText, { color: !isGroupChat ? '#fff' : colors.foreground }]}>
                    Direct
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chatTypeButton,
                    isGroupChat && { backgroundColor: colors.tint, borderColor: colors.tint }
                  ]}
                  onPress={() => {
                    setIsGroupChat(true);
                    setSelectedFriend(null);
                  }}
                >
                  <Ionicons name="people" size={20} color={isGroupChat ? '#fff' : colors.foreground} />
                  <Text style={[styles.chatTypeText, { color: isGroupChat ? '#fff' : colors.foreground }]}>
                    Group
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Group Name Input */}
              {isGroupChat && (
                <View style={styles.groupNameContainer}>
                  <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Group Name</Text>
                  <TextInput
                    style={[styles.groupNameInput, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter group name..."
                    placeholderTextColor={colors.foreground + '80'}
                    value={groupName}
                    onChangeText={setGroupName}
                    maxLength={50}
                  />
                </View>
              )}

              {/* Friends List */}
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {isGroupChat ? 'Select Members' : 'Select Friend'}
              </Text>
              <View style={styles.friendsList}>
                {friends.length === 0 ? (
                  <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                    No friends yet. Add friends to start chatting!
                  </Text>
                ) : (
                  friends.map((friend) => {
                    const isSelected = isGroupChat 
                      ? selectedMembers.some(f => f.id === friend.id)
                      : selectedFriend?.id === friend.id;
                    
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[
                          styles.friendItem,
                          { borderColor: colors.border },
                          isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint }
                        ]}
                        onPress={() => {
                          if (isGroupChat) {
                            toggleMemberSelection(friend);
                          } else {
                            setSelectedFriend(friend);
                          }
                        }}
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
            </ScrollView>
          </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h1,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
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
  chatsList: {
    padding: Spacing.md,
  },
  chatCard: {
    marginBottom: Spacing.sm,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatInfo: {
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
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
  },
  lastMessage: {
    ...Typography.caption,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
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
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  startChatText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    ...Typography.h2,
  },
  createButton: {
    ...Typography.body,
    fontWeight: '600',
  },
  createButtonDisabled: {
    opacity: 0.3,
  },
  modalScroll: {
    padding: Spacing.lg,
  },
  chatTypeToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  chatTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    gap: Spacing.sm,
  },
  chatTypeText: {
    ...Typography.body,
    fontWeight: '600',
  },
  groupNameContainer: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
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
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  friendName: {
    ...Typography.body,
    flex: 1,
  },
  checkmark: {
    marginLeft: Spacing.sm,
  },
});
