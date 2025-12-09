import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, Message, ChatRoomWithDetails } from '@/services/messageService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MentionText } from '@/components/MentionText';

interface Participant {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export default function ChatRoomScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { id: chatRoomId } = useLocalSearchParams();

  const [chatRoom, setChatRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<Participant[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const subscriptionRef = useRef<any>(null);
  const reactionSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (chatRoomId) {
      loadChatRoom();
      loadMessages();
    }
  }, [chatRoomId]);

  useEffect(() => {
    if (chatRoomId && typeof chatRoomId === 'string') {
      subscriptionRef.current = messageService.subscribeToMessages(
        chatRoomId,
        (message, event) => {
          if (event === 'INSERT') {
            console.log('📨 Real-time INSERT received, ID:', message.id);
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === message.id);
              if (exists) {
                console.log('⚠️ Real-time: Message already in state, skipping');
                return prev;
              }
              console.log('✅ Real-time: Adding message to state');
              return [...prev, message];
            });
            scrollToBottom();
          } else if (event === 'UPDATE') {
            console.log('📝 Message UPDATE event received:', message);
            setMessages(prev =>
              prev.map(msg => (msg.id === message.id ? message : msg))
            );
          } else if (event === 'DELETE') {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === message.id
                  ? { ...msg, is_deleted: true, content: 'This message was deleted' }
                  : msg
              )
            );
          }
        }
      );

      reactionSubscriptionRef.current = messageService.subscribeToReactions(
        chatRoomId,
        (messageId, reactions) => {
          console.log('🎉 Reaction update received for message:', messageId, reactions);
          setMessages(prev =>
            prev.map(msg => (msg.id === messageId ? { ...msg, reactions } : msg))
          );
        }
      );
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (reactionSubscriptionRef.current) {
        reactionSubscriptionRef.current.unsubscribe();
      }
    };
  }, [chatRoomId]);

  const loadChatRoom = async () => {
    try {
      const rooms = await messageService.getUserChatRooms();
      const room = rooms.find(r => r.chat_room_id === chatRoomId);
      if (room) {
        setChatRoom(room);
        loadParticipants(room.participant_ids);
        markAsRead();
      }
    } catch (error: any) {
      console.error('Error loading chat room:', error);
      Alert.alert('Error', 'Failed to load chat room');
    }
  };

  const loadParticipants = async (participantIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, avatar_url')
        .in('id', participantIds);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      if (typeof chatRoomId === 'string') {
        const msgs = await messageService.getMessages(chatRoomId);
        setMessages(msgs);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      if (typeof chatRoomId === 'string') {
        await messageService.markMessagesAsRead(chatRoomId);
      }
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);

    // Check for @ mentions
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      if (!hasSpaceAfterAt) {
        // User is typing a mention
        setMentionQuery(textAfterAt.toLowerCase());
        setShowMentionSuggestions(true);
        
        // Filter participants based on query
        const filtered = participants.filter(p => {
          const username = p.username.toLowerCase();
          const firstName = p.first_name?.toLowerCase() || '';
          const lastName = p.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
          
          return username.includes(textAfterAt.toLowerCase()) ||
                 fullName.includes(textAfterAt.toLowerCase());
        });
        setMentionSuggestions(filtered);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (participant: Participant) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const textBeforeAt = newMessage.substring(0, lastAtIndex);
    const newText = `${textBeforeAt}@${participant.username} `;
    setNewMessage(newText);
    setShowMentionSuggestions(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || isSending) return;

    try {
      setIsSending(true);
      const sentMessage = await messageService.sendMessage(chatRoomId as string, newMessage.trim());
      
      console.log('📤 Message sent, ID:', sentMessage.id);
      
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === sentMessage.id);
        if (exists) {
          console.log('⚠️ Message already in state, skipping optimistic update');
          return prev;
        }
        console.log('✅ Adding message to state optimistically');
        return [...prev, sentMessage];
      });
      
      setNewMessage('');
      setShowMentionSuggestions(false);
      scrollToBottom();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender_id === user?.id;
    const isDeleted = message.is_deleted;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && (
          <View style={styles.senderInfo}>
            {message.sender?.avatar_url ? (
              <Image source={{ uri: message.sender.avatar_url }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={16} color={colors.foreground} />
              </View>
            )}
          </View>
        )}
        <View style={styles.messageContent}>
          {!isOwnMessage && (
            <Text style={[styles.senderName, { color: colors.foreground, opacity: 0.7 }]}>
              {message.sender?.first_name || message.sender?.username}
            </Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.card },
              isDeleted && styles.deletedMessage,
            ]}
          >
            <MentionText
              text={message.content}
              style={[
                styles.messageText,
                { color: isOwnMessage ? '#fff' : colors.foreground },
                isDeleted && styles.deletedMessageText,
              ]}
              mentionColor={isOwnMessage ? '#E3F2FD' : '#007AFF'}
            />
          </View>
          <Text style={[styles.messageTime, { color: colors.foreground, opacity: 0.5 }]}>
            {formatTimeAgo(message.created_at)}
            {message.updated_at !== message.created_at && !isDeleted && ' (edited)'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {chatRoom?.avatar_url ? (
              <Image source={{ uri: chatRoom.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons
                  name={chatRoom?.chat_type === 'group' ? 'people' : 'person'}
                  size={20}
                  color={colors.foreground}
                />
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
                {chatRoom?.chat_name || 'Chat'}
              </Text>
              {chatRoom?.chat_type === 'group' && (
                <Text style={[styles.headerSubtitle, { color: colors.foreground, opacity: 0.6 }]}>
                  {participants.length} members
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.foreground} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.foreground, opacity: 0.6 }]}>
                Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>
      )}

      {/* Mention Suggestions */}
      {showMentionSuggestions && mentionSuggestions.length > 0 && (
        <View style={[styles.mentionSuggestions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mentionSuggestions.map((participant) => (
              <TouchableOpacity
                key={participant.id}
                style={[styles.mentionSuggestion, { backgroundColor: colors.background }]}
                onPress={() => handleMentionSelect(participant)}
              >
                {participant.avatar_url ? (
                  <Image source={{ uri: participant.avatar_url }} style={styles.mentionAvatar} />
                ) : (
                  <View style={[styles.mentionAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                    <Ionicons name="person" size={12} color={colors.foreground} />
                  </View>
                )}
                <View style={styles.mentionInfo}>
                  <Text style={[styles.mentionName, { color: colors.foreground }]} numberOfLines={1}>
                    {participant.first_name || participant.username}
                  </Text>
                  <Text style={[styles.mentionUsername, { color: colors.foreground, opacity: 0.6 }]} numberOfLines={1}>
                    @{participant.username}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Type a message... (use @ to mention)"
            placeholderTextColor={colors.foreground + '80'}
            value={newMessage}
            onChangeText={handleMessageChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: newMessage.trim() ? colors.tint : colors.border },
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...Typography.caption,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
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
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  senderInfo: {
    marginRight: Spacing.sm,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContent: {
    maxWidth: '70%',
  },
  senderName: {
    ...Typography.caption,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageText: {
    ...Typography.body,
  },
  deletedMessage: {
    opacity: 0.6,
  },
  deletedMessageText: {
    fontStyle: 'italic',
  },
  messageTime: {
    ...Typography.caption,
    marginTop: 4,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.body,
    maxHeight: 100,
    paddingVertical: Spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  mentionSuggestions: {
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxHeight: 80,
  },
  mentionSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    minWidth: 120,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 13,
  },
  mentionUsername: {
    ...Typography.caption,
    fontSize: 11,
  },
});
