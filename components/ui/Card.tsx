import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'wellness' | 'glow';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const shadows = Shadows[colorScheme ?? 'light'];

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
    };

    let shadowStyle: ViewStyle = {};
    
    switch (variant) {
      case 'wellness':
        shadowStyle = shadows.wellness;
        return {
          ...baseStyle,
          ...shadowStyle,
          borderColor: colors.border + '80', // 50% opacity
        };
      case 'glow':
        shadowStyle = shadows.glow;
        return {
          ...baseStyle,
          ...shadowStyle,
          borderColor: colors.primary + '33', // 20% opacity
        };
      default:
        // For default, use card shadow
        if (Platform.OS === 'android') {
          shadowStyle = { elevation: shadows.card.elevation };
        } else {
          shadowStyle = shadows.card;
        }
        return {
          ...baseStyle,
          ...shadowStyle,
          borderColor: colors.border + '80', // 50% opacity
        };
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
}
