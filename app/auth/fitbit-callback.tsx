import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function FitbitCallbackScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    // The Fitbit OAuth flow will redirect here
    // expo-auth-session handles the token exchange automatically
    // Just redirect back to settings
    const timer = setTimeout(() => {
      router.replace('/(tabs)/settings');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.foreground }]}>
        Connecting to Fitbit...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  text: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.medium,
  },
});
