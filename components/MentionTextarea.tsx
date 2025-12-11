import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import { Friend } from '@/services/friendService';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  mentionableUsers?: Friend[]; // Optional list of users to mention (defaults to friends)
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength = 1000,
  mentionableUsers,
}: MentionTextareaProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { friends } = useFriends();

  const [showMentionModal, setShowMentionModal] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<Friend[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isInsertingMention, setIsInsertingMention] = useState(false);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  const users = mentionableUsers || friends;

  // Track the last key pressed
  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === '@') {
      setLastKeyPressed('@');
    } else {
      setLastKeyPressed(null);
    }
  };

  // Detect @ mentions
  useEffect(() => {
    if (isInsertingMention) return;
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    // Only show mention modal if @ was just pressed and cursor is right after @
    if (lastKeyPressed === '@' && lastAtSymbol === cursorPosition - 1) {
      setMentionQuery('');
      setFilteredUsers(users);
      setShowMentionModal(users.length > 0);
    } else if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const isTypingAfterAt = lastKeyPressed !== null && 
                            ![' ', '\n', '@'].includes(lastKeyPressed) &&
                            textAfterAt.length > 0 &&
                            cursorPosition > lastAtSymbol;
      
      if (isTypingAfterAt) {
        setMentionQuery(textAfterAt.toLowerCase());
        const filtered = users.filter(user => {
          const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
          const username = user.username?.toLowerCase() || '';
          return (
            fullName.includes(textAfterAt.toLowerCase()) ||
            username.includes(textAfterAt.toLowerCase())
          );
        });
        setFilteredUsers(filtered);
        setShowMentionModal(filtered.length > 0);
      } else if (lastKeyPressed === ' ' || lastKeyPressed === '\n') {
        setShowMentionModal(false);
      }
    } else {
      setShowMentionModal(false);
    }
  }, [value, cursorPosition, users, isInsertingMention, lastKeyPressed]);

  const insertMention = (user: Friend) => {
    setIsInsertingMention(true);
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    const username = user.username || `${user.first_name}${user.last_name}`;

    const beforeMention = value.substring(0, lastAtSymbol);
    const afterCursor = value.substring(cursorPosition);

    const newValue = `${beforeMention}@${username} ${afterCursor}`;
    onChange(newValue);
    
    // Close the mention modal and reset states
    setShowMentionModal(false);
    setMentionQuery('');
    
    // Calculate and set the new cursor position after the inserted mention
    const newCursorPosition = lastAtSymbol + username.length + 2; // +2 for @ and space
    setCursorPosition(newCursorPosition);
    
    // Reset the flag after a small delay
    setTimeout(() => {
      setIsInsertingMention(false);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        placeholder={placeholder}
        placeholderTextColor={colors.foreground + '80'}
        value={value}
        onChangeText={onChange}
        onKeyPress={handleKeyPress}
        onSelectionChange={(event) => {
          const newPosition = event.nativeEvent.selection.start;
          setCursorPosition(newPosition);
          
          // Reset lastKeyPressed when cursor moves
          setLastKeyPressed(null);
        }}
        multiline
        maxLength={maxLength}
        editable={!disabled}
      />

      {/* Mention Suggestions Modal */}
      <Modal
        visible={showMentionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMentionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMentionModal(false)}
        >
          <View style={[styles.mentionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView style={styles.mentionList} keyboardShouldPersistTaps="handled">
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.mentionItem, { borderBottomColor: colors.border }]}
                  onPress={() => insertMention(user)}
                >
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.mentionAvatar} />
                  ) : (
                    <View style={[styles.mentionAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                      <Ionicons name="person" size={16} color={colors.foreground} />
                    </View>
                  )}
                  <View style={styles.mentionInfo}>
                    <Text style={[styles.mentionName, { color: colors.foreground }]}>
                      {user.first_name} {user.last_name}
                    </Text>
                    {user.username && (
                      <Text style={[styles.mentionUsername, { color: colors.foreground, opacity: 0.6 }]}>
                        @{user.username}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    minHeight: 100, // Reverted to original height
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  mentionModal: {
    maxHeight: 300,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  mentionList: {
    maxHeight: 300,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    ...Typography.body,
    fontWeight: '600',
  },
  mentionUsername: {
    ...Typography.caption,
  },
});
