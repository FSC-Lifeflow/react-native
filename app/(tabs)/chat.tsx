import { EventsSidebar } from '@/components/EventsSidebar';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { chatService } from '@/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const {
    conversations,
    loading: chatHistoryLoading,
    createConversation,
    loadConversationMessages,
    addMessageToConversation,
    deleteConversation,
  } = useChatHistory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Google Calendar integration
  const { events } = useGoogleCalendar();

  // Event selection handler
  const handleEventSelect = (eventId: string | null) => {
    setSelectedEventId(eventId);
    console.log('🎯 Event selected:', eventId);
  };

  // Loading messages that cycle while waiting for AI response
  const loadingMessages = useMemo(
    () => [
      'Analyzing your health data...',
      'Checking your recent activity...',
      'Reviewing your progress...',
      'Consulting wellness insights...',
      'Crafting a personalized response...',
      'Almost there...',
    ],
    []
  );

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. I've been analyzing your recent activity and I'm impressed with your consistency! How are you feeling about your progress this week?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user?.first_name]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Cycle through loading messages while AI is typing
  useEffect(() => {
    if (!isTyping) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isTyping, loadingMessages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const userMessageContent = inputValue;
    const timestamp = new Date();

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: userMessageContent,
      isUser: true,
      timestamp,
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Create conversation if this is the first message
      let conversationId = selectedConversationId;

      if (!conversationId) {
        const title =
          userMessageContent.length > 50
            ? userMessageContent.substring(0, 47) + '...'
            : userMessageContent;

        const newConversation = await createConversation(title, []);

        if (newConversation) {
          conversationId = newConversation.id;
          setSelectedConversationId(conversationId);
        } else {
          throw new Error('Failed to create conversation');
        }
      }

      // Save user message to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: userMessageContent,
          is_user: true,
          timestamp,
        });
      }

      // Get selected event data if any
      const selectedEvent = selectedEventId 
        ? events.find(event => event.id === selectedEventId) 
        : undefined;

      // Get AI response from webhook
      const webhookResponse = await chatService.sendMessage(
        user.id,
        userMessageContent,
        conversationId,
        selectedEvent ? {
          id: selectedEvent.id,
          summary: selectedEvent.summary,
          description: selectedEvent.description,
          start: selectedEvent.start,
          end: selectedEvent.end,
          location: selectedEvent.location,
          attendees: selectedEvent.attendees,
        } : undefined
      );

      let aiResponseContent =
        "I'm sorry, I'm having trouble processing your request right now. Please try again.";

      if (webhookResponse) {
        aiResponseContent = webhookResponse;
      }

      const aiTimestamp = new Date();
      const aiResponse: Message = {
        id: `temp-ai-${Date.now()}`,
        content: aiResponseContent,
        isUser: false,
        timestamp: aiTimestamp,
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Save AI response to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: aiResponseContent,
          is_user: false,
          timestamp: aiTimestamp,
        });
      }
    } catch (error) {
      console.error('Error processing chat message:', error);

      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        content: "I'm experiencing technical difficulties. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setShowHistory(false);
    setMessages([
      {
        id: '1',
        content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. How can I help you today?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowHistory(false);

    const result = await loadConversationMessages(conversationId);
    if (result && result.messages) {
      setMessages(
        result.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: msg.timestamp,
        }))
      );
    }
  };

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteConversation(conversationId);
            if (success && selectedConversationId === conversationId) {
              handleNewConversation();
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      {!item.isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          item.isUser
            ? [styles.userBubble, { backgroundColor: colors.secondary }]
            : [styles.aiBubble, { backgroundColor: colors.muted }],
        ]}
      >
        {item.isUser ? (
          <Text
            style={[
              styles.messageText,
              { color: '#fff' },
            ]}
          >
            {item.content}
          </Text>
        ) : (
          <Markdown
            style={{
              body: {
                color: colors.foreground,
                fontSize: Typography.fontSizes.sm,
                lineHeight: 20,
              },
              paragraph: {
                marginTop: 0,
                marginBottom: 8,
              },
              strong: {
                fontWeight: '600',
              },
              em: {
                fontStyle: 'italic',
              },
              bullet_list: {
                marginVertical: 4,
              },
              ordered_list: {
                marginVertical: 4,
              },
              list_item: {
                marginVertical: 2,
              },
              code_inline: {
                backgroundColor: colors.background,
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: Typography.fontSizes.xs,
              },
              fence: {
                backgroundColor: colors.background,
                padding: 8,
                borderRadius: 6,
                marginVertical: 4,
              },
              code_block: {
                fontFamily: 'monospace',
                fontSize: Typography.fontSizes.xs,
              },
              link: {
                color: colors.primary,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
                paddingLeft: 8,
                marginVertical: 4,
                opacity: 0.8,
              },
              heading1: {
                fontSize: Typography.fontSizes.lg,
                fontWeight: '700',
                marginBottom: 8,
              },
              heading2: {
                fontSize: Typography.fontSizes.base,
                fontWeight: '600',
                marginBottom: 6,
              },
              heading3: {
                fontSize: Typography.fontSizes.sm,
                fontWeight: '600',
                marginBottom: 4,
              },
            }}
          >
            {item.content}
          </Markdown>
        )}
        <Text
          style={[
            styles.timestamp,
            { color: item.isUser ? 'rgba(255,255,255,0.7)' : colors.mutedForeground },
          ]}
        >
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {item.isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
      )}
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.aiMessageContainer]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Ionicons name="sparkles" size={16} color="#fff" />
      </View>
      <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.muted }]}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay1, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay2, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          {loadingMessages[loadingMessageIndex]}
        </Text>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: typeof conversations[0] }) => (
    <TouchableOpacity
      style={[
        styles.historyItem,
        { backgroundColor: colors.card, borderColor: colors.border },
        selectedConversationId === item.id && { borderColor: colors.primary },
      ]}
      onPress={() => handleConversationSelect(item.id)}
    >
      <View style={styles.historyItemContent}>
        {item.is_pinned && (
          <Ionicons name="pin" size={14} color={colors.primary} style={styles.pinIcon} />
        )}
        <Text style={[styles.historyTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.historyItemActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteConversation(item.id, item.title)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive || '#ef4444'} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setShowHistory(!showHistory);
            if (!showHistory) setShowEvents(false);
          }}
        >
          <Ionicons
            name={showHistory ? 'chatbubbles' : 'time-outline'}
            size={24}
            color={showHistory ? colors.primary : colors.foreground}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              AI Wellness Coach
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#34c759' }]} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                Online & ready to help
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setShowEvents(!showEvents);
            if (!showEvents) setShowHistory(false);
          }}
        >
          <Ionicons
            name={showEvents ? 'chatbubbles' : 'calendar-outline'}
            size={24}
            color={showEvents ? colors.primary : colors.foreground}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={handleNewConversation}>
          <Ionicons name="add-circle-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {showEvents ? (
        // Events Sidebar View
        <EventsSidebar
          onEventSelect={handleEventSelect}
          selectedEventId={selectedEventId}
          onClose={() => setShowEvents(false)}
        />
      ) : showHistory ? (
        // Conversation History View
        <View style={styles.historyContainer}>
          <Text style={[styles.historyHeader, { color: colors.foreground }]}>
            Conversation History
          </Text>
          {chatHistoryLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                Start chatting with your AI coach!
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              contentContainerStyle={styles.historyList}
            />
          )}
        </View>
      ) : (
        // Chat View
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            ListFooterComponent={isTyping ? renderTypingIndicator : null}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Input Area */}
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>

            {/* Selected Event Indicator */}
            {selectedEventId && (
              <View style={[styles.selectedEventBanner, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                <Ionicons name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.selectedEventText, { color: colors.foreground }]} numberOfLines={1}>
                  {events.find(e => e.id === selectedEventId)?.summary || 'Event selected'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Ask about your progress, schedule, or get wellness tips..."
                placeholderTextColor={colors.mutedForeground}
                value={inputValue}
                onChangeText={setInputValue}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: inputValue.trim() && !isTyping ? colors.primary : colors.muted,
                  },
                ]}
                onPress={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputValue.trim() && !isTyping ? '#fff' : colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.sm,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  dotDelay1: {
    opacity: 0.8,
  },
  dotDelay2: {
    opacity: 1,
  },
  loadingText: {
    fontSize: Typography.fontSizes.xs,
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizes.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  historyHeader: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    marginVertical: Spacing.lg,
  },
  historyList: {
    gap: Spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  historyItemContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  pinIcon: {
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: Typography.fontSizes.xs,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.medium,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
  },
  loader: {
    marginTop: Spacing['2xl'],
  },
  selectedEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  selectedEventText: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
});
