import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import * as Linking from 'expo-linking';

const SESSION_KEY = 'lifeflow_session';

/**
 * OAuth Callback Handler
 * This route handles the redirect from OAuth providers (Google, etc.)
 * It extracts the tokens from the URL and sets the session
 */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed) {
      console.log('⏭️ Callback already processed, skipping');
      return;
    }

    // Only run if we have params
    if (!params || Object.keys(params).length === 0) {
      console.log('⏸️ No params yet, waiting...');
      return;
    }

    // Wait a bit for the router to be ready
    const timer = setTimeout(() => {
      handleCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  const handleCallback = async () => {
    // Mark as processed immediately to prevent re-runs
    setHasProcessed(true);
    
    try {
      console.log('🔄 Processing OAuth callback...');
      console.log('📦 Callback params:', params);

      // On web, Supabase puts tokens in the hash fragment
      // They come as params['#'] = 'access_token=...&refresh_token=...'
      let accessToken = params.access_token as string;
      let refreshToken = params.refresh_token as string;
      let error = params.error as string;
      let errorDescription = params.error_description as string;

      // If tokens aren't directly in params, check the hash fragment
      if (!accessToken && params['#']) {
        const hashParams = new URLSearchParams(params['#'] as string);
        accessToken = hashParams.get('access_token') || '';
        refreshToken = hashParams.get('refresh_token') || '';
        error = hashParams.get('error') || '';
        errorDescription = hashParams.get('error_description') || '';
      }

      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        Alert.alert('Authentication Failed', errorDescription || error);
        setIsProcessing(false);
        setTimeout(() => router.replace('/(auth)/sign-in'), 100);
        return;
      }

      if (accessToken && refreshToken) {
        console.log('✅ Tokens received, setting session...');
        
        // Set the session in Supabase
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          Alert.alert('Authentication Failed', 'Failed to establish session. Please try again.');
          setIsProcessing(false);
          setTimeout(() => router.replace('/(auth)/sign-in'), 100);
          return;
        }

        console.log('✅ Session set, user:', data.user?.email);

        // Save session to AsyncStorage for persistence
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
        }));

        // Handle OAuth callback to create/fetch user profile
        try {
          const { user } = await authService.handleOAuthCallback();
          console.log('✅ User profile retrieved:', user.email);
          
          // Check if profile is complete
          const isProfileComplete = user.username && user.first_name && user.last_name;
          
          setIsProcessing(false);
          
          if (isProfileComplete) {
            // Navigate to dashboard
            router.replace('/(tabs)/dashboard');
          } else {
            // Navigate to complete profile (if you have this route)
            // For now, just go to dashboard
            router.replace('/(tabs)/dashboard');
          }
        } catch (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          // Still navigate to dashboard even if profile fetch fails
          setIsProcessing(false);
          router.replace('/(tabs)/dashboard');
        }
      } else {
        console.error('❌ No tokens found in callback URL');
        console.log('Available params:', Object.keys(params));
        Alert.alert('Authentication Failed', 'No authentication tokens received. Please try again.');
        setIsProcessing(false);
        setTimeout(() => router.replace('/(auth)/sign-in'), 100);
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      Alert.alert('Error', 'An error occurred during authentication.');
      setIsProcessing(false);
      setTimeout(() => router.replace('/(auth)/sign-in'), 100);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6B8E5F" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
