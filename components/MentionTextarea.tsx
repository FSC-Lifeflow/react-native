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

  const users = mentionableUsers || friends;

  // Detect @ mentions
  useEffect(() => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        // We're in a mention
        setMentionQuery(textAfterAt.toLowerCase());

        // Filter users based on query
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
      } else {
        setShowMentionModal(false);
      }
    } else {
      setShowMentionModal(false);
    }
  }, [value, cursorPosition, users]);

  const insertMention = (user: Friend) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    const username = user.username || `${user.first_name}${user.last_name}`;

    const beforeMention = value.substring(0, lastAtSymbol);
    const afterCursor = value.substring(cursorPosition);

    const newValue = `${beforeMention}@${username} ${afterCursor}`;
    onChange(newValue);

    setShowMentionModal(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        placeholder={placeholder}
        placeholderTextColor={colors.foreground + '80'}
        value={value}
        onChangeText={onChange}
        onSelectionChange={(event) => {
          setCursorPosition(event.nativeEvent.selection.start);
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
    minHeight: 44,
    maxHeight: 120,
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
