import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Chat Message Types
 */
export interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatPayload {
  userId: string;
  conversationId: string | null;
  timestamp: string;
  action: string;
  message: string;
  source: string;
  selected_event?: {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    attendees?: Array<{ email: string; displayName?: string; responseStatus: string }>;
  };
}

/**
 * Chat Service
 * Handles AI chat interactions and conversation management
 */
export const chatService = {
  /**
   * Send a message to the AI wellness coach
   */
  async sendMessage(
    userId: string,
    message: string,
    conversationId: string | null = null,
    selectedEvent?: ChatPayload['selected_event']
  ): Promise<string | null> {
    try {
      const payload: ChatPayload = {
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
        action: 'chat_message',
        message,
        source: 'mobile_app',
      };

      if (selectedEvent) {
        payload.selected_event = selectedEvent;
        console.log('✅ Event data added to payload:', selectedEvent.summary);
      }

      console.log('[ChatService] Sending message to:', `${API_BASE_URL}/api/chat`);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatService] Request failed:', response.status, response.statusText);
        console.error('[ChatService] Error details:', errorText);
        return null;
      }

      const data = await response.json();
      console.log('[ChatService] Response received');
      return data.output;
    } catch (error) {
      console.error('[ChatService] Error sending message:', error);
      return null;
    }
  },

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ChatService] Error fetching conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ChatService] Error fetching conversations:', error);
      return [];
    }
  },

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title,
          is_pinned: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[ChatService] Error creating conversation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ChatService] Error creating conversation:', error);
      return null;
    }
  },

  /**
   * Load messages for a conversation
   */
  async loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('[ChatService] Error loading messages:', error);
        return [];
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        is_user: msg.is_user,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('[ChatService] Error loading messages:', error);
      return [];
    }
  },

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    content: string,
    isUser: boolean,
    timestamp: Date
  ): Promise<void> {
    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        content,
        is_user: isUser,
        timestamp: timestamp.toISOString(),
      });

      if (error) {
        console.error('[ChatService] Error adding message:', error);
      }

      // Update conversation's updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('[ChatService] Error adding message:', error);
    }
  },

  /**
   * Delete a conversation and its messages
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      // Delete messages first (foreign key constraint)
      await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('[ChatService] Error deleting conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ChatService] Error deleting conversation:', error);
      return false;
    }
  },

  /**
   * Toggle pin status of a conversation
   */
  async togglePinConversation(conversationId: string, isPinned: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_pinned: isPinned })
        .eq('id', conversationId);

      if (error) {
        console.error('[ChatService] Error toggling pin:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ChatService] Error toggling pin:', error);
      return false;
    }
  },
};
