import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

/**
 * OAuth Callback Handler
 * This route handles the redirect from OAuth providers (Google, etc.)
 * It extracts the tokens from the URL and sets the session
 */
export default function AuthCallback() {
  const router = useRouter();
  const segments = useSegments();
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
      console.log('📝 URL params:', params);
      console.log('📝 Params keys:', Object.keys(params));

      // On web, Supabase puts tokens in the hash fragment
      // They come as params['#'] = 'access_token=...&refresh_token=...'
      let accessToken = params.access_token as string;
      let refreshToken = params.refresh_token as string;
      let error = params.error as string;
      let errorDescription = params.error_description as string;

      console.log('🔍 Initial token check:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasHashParam: !!params['#']
      });

      // If tokens aren't directly in params, check the hash fragment
      if (!accessToken && params['#']) {
        console.log('🔍 Parsing hash fragment:', params['#']);
        const hashParams = new URLSearchParams(params['#'] as string);
        accessToken = hashParams.get('access_token') || '';
        refreshToken = hashParams.get('refresh_token') || '';
        error = hashParams.get('error') || '';
        errorDescription = hashParams.get('error_description') || '';
        
        console.log('🔍 After parsing hash:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length,
          refreshTokenLength: refreshToken?.length
        });
      }

      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        alert(`Authentication failed: ${errorDescription || error}`);
        setIsProcessing(false);
        setTimeout(() => router.replace('/(auth)/sign-in'), 100);
        return;
      }

      if (accessToken && refreshToken) {
        console.log('🔑 Setting session with tokens...');
        console.log('🔑 Access token length:', accessToken.length);
        console.log('🔑 Refresh token length:', refreshToken.length);
        
        // Set the session in Supabase
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          alert('Failed to set session. Please try again.');
          setIsProcessing(false);
          setTimeout(() => router.replace('/(auth)/sign-in'), 100);
          return;
        }

        console.log('✅ Session set successfully!');
        console.log('👤 User:', data.user?.email);
        console.log('👤 User ID:', data.user?.id);
        console.log('🚀 Redirecting to dashboard...');

        // Auth state has changed, now redirect immediately
        setIsProcessing(false);
        
        // Try navigation
        console.log('🔄 Attempting navigation to /(tabs)/dashboard');
        try {
          router.push('/(tabs)/dashboard');
          console.log('✅ Navigation command executed');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          // Fallback: try replace instead
          console.log('🔄 Trying router.replace as fallback');
          router.replace('/(tabs)/dashboard');
        }
      } else {
        console.error('❌ No tokens found in callback URL');
        console.error('❌ accessToken:', !!accessToken);
        console.error('❌ refreshToken:', !!refreshToken);
        alert('Authentication failed. Please try again.');
        setIsProcessing(false);
        setTimeout(() => router.replace('/(auth)/sign-in'), 100);
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      alert('An error occurred during authentication.');
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
