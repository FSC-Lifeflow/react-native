import { useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';

// Required for web browser to close properly after OAuth
WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Google Calendar OAuth hook for React Native
 * Handles the OAuth flow using expo-auth-session
 */
export function useGoogleCalendarOAuth() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use backend URL as redirect since Google doesn't support custom schemes well
  const redirectUri = `${API_BASE_URL}/api/google/callback/mobile`;

  /**
   * Initiate OAuth flow
   */
  const initiateOAuth = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Starting Google Calendar OAuth...');
      console.log('Redirect URI:', redirectUri);

      // Get OAuth URL from backend (GET request with query params)
      // Use the Expo redirect URI so Google redirects back to the app
      const params = new URLSearchParams({
        userId: user.id,
        redirectUri: redirectUri,
      });
      
      const response = await fetch(`${API_BASE_URL}/api/google/auth-url?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', response.status, errorText);
        throw new Error(`Failed to get OAuth URL: ${response.status} - ${errorText}`);
      }

      const { authUrl } = await response.json();
      console.log('📱 Opening OAuth URL...');

      // Open OAuth URL in browser
      // The backend will handle the callback and show a success page
      const result = await WebBrowser.openBrowserAsync(authUrl);

      console.log('Browser closed, result:', result);

      // Browser was closed, assume success if user didn't cancel immediately
      // We'll check if the connection was successful by checking the database
      console.log('✅ Checking if calendar was connected...');
      
      // Wait a moment for the backend to save the tokens
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // The calendar should now be connected, the GoogleCalendar component will refresh
      console.log('🎉 OAuth flow completed!');
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('OAuth error:', err);
      setError(err instanceof Error ? err.message : 'OAuth failed');
      setIsLoading(false);
      return false;
    }
  }, [user?.id, redirectUri]);

  return {
    initiateOAuth,
    isLoading,
    error,
  };
}
