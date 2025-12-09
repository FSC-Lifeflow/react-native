import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, chatService, Conversation } from '@/services/chatService';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing chat history and conversations
 */
export function useChatHistory() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Load conversations on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    } else {
      setConversations([]);
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Load all conversations for the current user
   */
  const loadConversations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await chatService.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('[useChatHistory] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (title: string, initialMessages: ChatMessage[] = []): Promise<Conversation | null> => {
      if (!user?.id) return null;

      try {
        const conversation = await chatService.createConversation(user.id, title);
        if (conversation) {
          setConversations((prev) => [conversation, ...prev]);
          setCurrentConversation(conversation);

          // Add initial messages if provided
          for (const msg of initialMessages) {
            await chatService.addMessage(
              conversation.id,
              msg.content,
              msg.is_user,
              msg.timestamp
            );
          }

          return conversation;
        }
        return null;
      } catch (error) {
        console.error('[useChatHistory] Error creating conversation:', error);
        return null;
      }
    },
    [user?.id]
  );

  /**
   * Load messages for a specific conversation
   */
  const loadConversationMessages = useCallback(
    async (conversationId: string): Promise<{ messages: ChatMessage[] } | null> => {
      try {
        const messages = await chatService.loadConversationMessages(conversationId);
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation) {
          setCurrentConversation({ ...conversation, messages });
        }
        return { messages };
      } catch (error) {
        console.error('[useChatHistory] Error loading messages:', error);
        return null;
      }
    },
    [conversations]
  );

  /**
   * Add a message to a conversation
   */
  const addMessageToConversation = useCallback(
    async (
      conversationId: string,
      message: { content: string; is_user: boolean; timestamp: Date }
    ): Promise<void> => {
      try {
        await chatService.addMessage(
          conversationId,
          message.content,
          message.is_user,
          message.timestamp
        );

        // Update local state
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, updated_at: new Date().toISOString() }
              : conv
          )
        );
      } catch (error) {
        console.error('[useChatHistory] Error adding message:', error);
      }
    },
    []
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      const success = await chatService.deleteConversation(conversationId);
      if (success) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
      }
      return success;
    } catch (error) {
      console.error('[useChatHistory] Error deleting conversation:', error);
      return false;
    }
  }, [currentConversation?.id]);

  /**
   * Toggle pin status of a conversation
   */
  const togglePinConversation = useCallback(
    async (conversationId: string, isPinned: boolean): Promise<boolean> => {
      try {
        const success = await chatService.togglePinConversation(conversationId, isPinned);
        if (success) {
          setConversations((prev) =>
            prev
              .map((c) => (c.id === conversationId ? { ...c, is_pinned: isPinned } : c))
              .sort((a, b) => {
                // Sort by pinned first, then by updated_at
                if (a.is_pinned !== b.is_pinned) {
                  return a.is_pinned ? -1 : 1;
                }
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
              })
          );
        }
        return success;
      } catch (error) {
        console.error('[useChatHistory] Error toggling pin:', error);
        return false;
      }
    },
    []
  );

  /**
   * Clear current conversation selection
   */
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
  }, []);

  /**
   * Refresh conversations list
   */
  const refresh = useCallback(async () => {
    await loadConversations();
  }, [user?.id]);

  return {
    conversations,
    loading,
    currentConversation,
    createConversation,
    loadConversationMessages,
    addMessageToConversation,
    deleteConversation,
    togglePinConversation,
    clearCurrentConversation,
    refresh,
  };
}
