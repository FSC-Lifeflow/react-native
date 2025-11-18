import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Custom storage adapter for React Native using expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // For web, use localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    }
    try {
      // Try SecureStore first
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
      // Fallback to AsyncStorage for large values
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      // Try AsyncStorage as fallback
      try {
        return await AsyncStorage.getItem(key);
      } catch (asyncError) {
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      // For web, use localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
      return;
    }
    try {
      // Check if value is too large for SecureStore (2048 bytes limit)
      if (value.length > 2048) {
        console.log('📦 Value too large for SecureStore, using AsyncStorage');
        await AsyncStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      // Fallback to AsyncStorage if SecureStore fails
      try {
        await AsyncStorage.setItem(key, value);
      } catch (asyncError) {
        console.error('AsyncStorage fallback also failed:', asyncError);
      }
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // For web, use localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
      // Also remove from AsyncStorage
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
};

// Create Supabase client with custom storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Note: persistSession is disabled because it causes signUp to hang in React Native
    // Users will need to re-login after app restart
    // TODO: Investigate alternative storage solutions or Supabase RN compatibility
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'lifeflow-mobile',
    },
  },
});

// Types for your database
export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  username: string;
  social_privacy?: boolean;
  activity_sharing?: boolean;
  // Fitness goal specifications stored on users table
  fitness_level?: string | null;
  primary_goals?: string | null;
  exercise_preferences?: string | null;
  weekly_frequency?: string | null;
  session_duration?: string | null;
  equipment_access?: string | null;
  physical_limitations?: string | null;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};
