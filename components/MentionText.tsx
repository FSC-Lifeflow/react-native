import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface MentionTextProps {
  text: string;
  style?: any;
  mentionColor?: string;
  onMentionClick?: (userId: string) => void;
}

export function MentionText({ text, style, mentionColor = '#007AFF', onMentionClick }: MentionTextProps) {
  const router = useRouter();

  // Split text into parts: regular text and @mentions
  const parts = text.split(/(@\w+)/g);

  const handleMentionClick = async (username: string) => {
    try {
      // Look up user ID by username
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (error || !user) {
        console.error('User not found:', username);
        Alert.alert('Error', 'User not found');
        return;
      }

      // If onMentionClick callback is provided, use it
      if (onMentionClick) {
        onMentionClick(user.id);
      } else {
        // Otherwise navigate to user profile
        router.push(`/user/${user.id}`);
      }
    } catch (error) {
      console.error('Error looking up mentioned user:', error);
      Alert.alert('Error', 'Failed to look up user');
    }
  };

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1); // Remove @ symbol
          return (
            <Text
              key={i}
              style={[styles.mention, { color: mentionColor }]}
              onPress={() => handleMentionClick(username)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mention: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
