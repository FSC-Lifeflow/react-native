import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatar_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  userDetails?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
  }>;
  hasReacted: boolean;
}

export interface WorkoutInvitationData {
  event_id: string;
  event_summary: string;
  event_start: string;
  event_end: string;
  event_location?: string;
  event_description?: string;
  accepted_by?: string[];
  declined_by?: string[];
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'workout_invitation';
  metadata?: WorkoutInvitationData;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  reactions?: MessageReaction[];
  sender?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export interface ChatRoomWithDetails {
  chat_room_id: string;
  chat_name: string;
  chat_type: 'direct' | 'group';
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  participant_ids: string[];
}

class MessageService {
  /**
   * Extracts @mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)];
  }

  /**
   * Processes mentions in a message
   */
  private async processMentions(
    messageId: string,
    content: string,
    senderId: string,
    senderName: string,
    chatRoomId: string,
    chatRoomName: string
  ): Promise<void> {
    try {
      const usernames = this.extractMentions(content);
      
      if (usernames.length === 0) {
        return;
      }

      console.log('📢 Found mentions in message:', usernames);

      const { data: mentionedUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('username', usernames);

      if (usersError) {
        console.error('❌ Failed to fetch mentioned users:', usersError);
        return;
      }

      if (!mentionedUsers || mentionedUsers.length === 0) {
        console.log('ℹ️ No valid users found for mentions');
        return;
      }

      const { data: participants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_room_id', chatRoomId)
        .in('user_id', mentionedUsers.map(u => u.id));

      if (participantsError) {
        console.error('❌ Failed to fetch participants:', participantsError);
        return;
      }

      const participantIds = new Set(participants?.map(p => p.user_id) || []);

      const mentionsToInsert = mentionedUsers
        .filter(user => user.id !== senderId && participantIds.has(user.id))
        .map(user => ({
          message_id: messageId,
          mentioned_user_id: user.id
        }));

      if (mentionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('message_mentions')
          .insert(mentionsToInsert);

        if (insertError) {
          console.error('❌ Failed to insert mentions:', insertError);
        } else {
          console.log('✅ Mentions saved successfully');
        }

        for (const user of mentionedUsers) {
          if (user.id !== senderId && participantIds.has(user.id)) {
            try {
              await notificationService.createNotification({
                user_id: user.id,
                type: 'message_mention',
                title: 'You were mentioned in a message',
                message: `${senderName} mentioned you in ${chatRoomName}`,
                read: false,
                data: {
                  message_id: messageId,
                  chat_room_id: chatRoomId,
                  sender_id: senderId,
                  sender_name: senderName,
                  chat_room_name: chatRoomName
                }
              });
              console.log(`✅ Notification sent to @${user.username}`);
            } catch (notifError) {
              console.error(`❌ Failed to send notification to @${user.username}:`, notifError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing mentions:', error);
    }
  }

  /**
   * Get all chat rooms for the current user
   */
  async getUserChatRooms(): Promise<ChatRoomWithDetails[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_user_chat_rooms', { user_uuid: user.id });

      if (error) {
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('Database function "get_user_chat_rooms" does not exist. Please run the messaging database migration.');
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      throw error;
    }
  }

  /**
   * Get or create a direct chat with another user
   */
  async getOrCreateDirectChat(otherUserId: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_or_create_direct_chat', {
          user1_id: user.id,
          user2_id: otherUserId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting/creating direct chat:', error);
      throw error;
    }
  }

  /**
   * Create a group chat
   */
  async createGroupChat(name: string, participantIds: string[]): Promise<ChatRoom> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: chatRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const participants = [user.id, ...participantIds].map(userId => ({
        chat_room_id: chatRoom.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      return chatRoom;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat room with reactions
   */
  async getMessages(chatRoomId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('chat_room_id', chatRoomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      const messages = data || [];
      const messagesWithReactions = await Promise.all(
        messages.map(async (message) => {
          const reactions = await this.getMessageReactions(message.id, user.id);
          return { ...message, reactions };
        })
      );

      return messagesWithReactions;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(chatRoomId: string, content: string): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          content
        })
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const { data: chatRoom } = await supabase
        .from('chat_rooms')
        .select('name')
        .eq('id', chatRoomId)
        .single();

      if (data.sender) {
        const senderName = `${data.sender.first_name || ''} ${data.sender.last_name || ''}`.trim() || data.sender.username;
        const chatRoomName = chatRoom?.name || 'a chat';
        await this.processMentions(data.id, content, user.id, senderName, chatRoomId, chatRoomName);
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send a workout invitation message to a chat room
   */
  async sendWorkoutInvitation(
    chatRoomId: string,
    workoutData: WorkoutInvitationData
  ): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const content = `📅 Workout Invitation: ${workoutData.event_summary}`;
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          content,
          message_type: 'workout_invitation',
          metadata: {
            ...workoutData,
            accepted_by: [],
            declined_by: []
          }
        })
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending workout invitation:', error);
      throw error;
    }
  }

  /**
   * Update workout invitation response (accept/decline)
   */
  async updateWorkoutInvitationResponse(
    messageId: string,
    userId: string,
    action: 'accept' | 'decline'
  ): Promise<void> {
    try {
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const metadata = message.metadata as WorkoutInvitationData;
      const acceptedBy = metadata.accepted_by || [];
      const declinedBy = metadata.declined_by || [];

      const newAcceptedBy = acceptedBy.filter(id => id !== userId);
      const newDeclinedBy = declinedBy.filter(id => id !== userId);

      if (action === 'accept') {
        newAcceptedBy.push(userId);
      } else {
        newDeclinedBy.push(userId);
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({
          metadata: {
            ...metadata,
            accepted_by: newAcceptedBy,
            declined_by: newDeclinedBy
          }
        })
        .eq('id', messageId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating workout invitation response:', error);
      throw error;
    }
  }

  /**
   * Mark messages in a chat room as read
   */
  async markMessagesAsRead(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .rpc('mark_messages_read', {
          room_id: chatRoomId,
          user_uuid: user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new messages in a chat room
   */
  subscribeToMessages(
    chatRoomId: string,
    callback: (message: Message, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
  ) {
    console.log('🔔 Subscribing to messages for chat room:', chatRoomId);
    
    const subscription = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        async (payload) => {
          console.log('📨 New message received (INSERT):', payload);
          
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(
                id,
                username,
                first_name,
                last_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            console.log('✅ Message data fetched:', data);
            callback(data, 'INSERT');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        async (payload) => {
          console.log('✏️ Message updated (UPDATE):', payload);
          
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(
                id,
                username,
                first_name,
                last_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data, 'UPDATE');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        (payload) => {
          console.log('🗑️ Message deleted (DELETE):', payload);
          callback(payload.old as Message, 'DELETE');
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Channel closed');
        } else {
          console.log('📡 Subscription status:', status);
        }
      });

    return subscription;
  }

  /**
   * Subscribe to chat room updates
   */
  subscribeToChatRooms(callback: () => void) {
    const subscription = supabase
      .channel('chat_rooms_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, content: string): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      await supabase
        .from('message_mentions')
        .delete()
        .eq('message_id', messageId);

      const { data: chatRoom } = await supabase
        .from('chat_rooms')
        .select('name')
        .eq('id', data.chat_room_id)
        .single();

      if (data.sender) {
        const senderName = `${data.sender.first_name || ''} ${data.sender.last_name || ''}`.trim() || data.sender.username;
        const chatRoomName = chatRoom?.name || 'a chat';
        await this.processMentions(data.id, content, user.id, senderName, data.chat_room_id, chatRoomName);
      }

      return data;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get reactions for a message
   */
  async getMessageReactions(messageId: string, currentUserId: string): Promise<MessageReaction[]> {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          emoji,
          user_id,
          users:user_id (
            id,
            username,
            first_name,
            last_name
          )
        `)
        .eq('message_id', messageId);

      if (error) throw error;

      const reactionMap = new Map<string, MessageReaction>();
      
      (data || []).forEach((reaction: any) => {
        const emoji = reaction.emoji;
        const userId = reaction.user_id;
        const userName = reaction.users?.first_name
          ? `${reaction.users.first_name} ${reaction.users.last_name || ''}`.trim()
          : reaction.users?.username || 'Someone';

        if (!reactionMap.has(emoji)) {
          reactionMap.set(emoji, {
            emoji,
            count: 0,
            users: [],
            userDetails: [],
            hasReacted: false
          });
        }

        const reactionData = reactionMap.get(emoji)!;
        reactionData.count++;
        reactionData.users.push(userId);
        reactionData.userDetails!.push({
          id: userId,
          name: userName,
          avatar_url: reaction.users?.avatar_url
        });
        
        if (userId === currentUserId) {
          reactionData.hasReacted = true;
        }
      });

      return Array.from(reactionMap.values());
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }
  }

  /**
   * Add or remove a reaction to a message (toggle)
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }

  /**
   * Subscribe to reaction changes for a chat room
   */
  subscribeToReactions(
    chatRoomId: string,
    callback: (messageId: string, reactions: MessageReaction[]) => void
  ) {
    console.log('🔔 Subscribing to reactions for chat room:', chatRoomId);
    
    const subscription = supabase
      .channel(`reactions:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        async (payload: any) => {
          console.log('⚡ Reaction change detected:', payload);
          
          const messageId = payload.new?.message_id || payload.old?.message_id;
          if (!messageId) return;

          const { data: message } = await supabase
            .from('messages')
            .select('chat_room_id')
            .eq('id', messageId)
            .single();

          if (message?.chat_room_id !== chatRoomId) {
            console.log('⏭️ Skipping reaction - message not in current chat room');
            return;
          }

          console.log('✅ Reaction is for current chat room, fetching updated reactions');

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const reactions = await this.getMessageReactions(messageId, user.id);
          console.log('📊 Updated reactions:', reactions);
          callback(messageId, reactions);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to reactions channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Reactions channel error');
        }
      });

    return subscription;
  }

  /**
   * Update chat room name
   */
  async updateChatRoomName(chatRoomId: string, newName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ name: newName })
        .eq('id', chatRoomId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating chat room name:', error);
      throw error;
    }
  }

  /**
   * Add participant to group chat
   */
  async addParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: chatRoomId,
          user_id: userId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from group chat
   */
  async removeParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_room_id', chatRoomId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Leave a chat room
   */
  async leaveChatRoom(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await this.removeParticipant(chatRoomId, user.id);
    } catch (error) {
      console.error('Error leaving chat room:', error);
      throw error;
    }
  }

  /**
   * Update chat room details
   */
  async updateChatRoom(
    chatRoomId: string,
    updates: { name?: string; avatar_url?: string }
  ): Promise<ChatRoom> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatRoomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating chat room:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
