import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// Enable WebBrowser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

/**
 * Type definition for user data that matches our database schema
 */
type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  username: string;
  social_privacy?: boolean;
  activity_sharing?: boolean;
  // Fitness goal specifications
  fitness_level?: string | null;
  primary_goals?: string | null;
  exercise_preferences?: string | null;
  weekly_frequency?: string | null;
  session_duration?: string | null;
  equipment_access?: string | null;
  physical_limitations?: string | null;
};

/**
 * Auth Service for React Native
 * Handles authentication with Supabase
 */
export const authService = {
  /**
   * Registers a new user with email and password
   */
  async register(userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    try {
      console.log('🚀 Starting registration for:', userData.email);
      console.log('📡 Calling Supabase signUp...');

      // Add timeout wrapper
      const signUpPromise = supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          console.error('⏱️ Supabase signUp timeout - this usually means:');
          console.error('1. Network connectivity issue');
          console.error('2. Supabase project is paused or unreachable');
          console.error('3. Invalid Supabase URL/key in .env');
          reject(new Error('Registration timed out. Please check your Supabase project status and internet connection.'));
        }, 15000)
      );

      const { data: authData, error: authError } = await Promise.race([
        signUpPromise,
        timeoutPromise,
      ]);

      console.log('📬 Received response from Supabase');
      console.log('Response data:', JSON.stringify(authData, null, 2));

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        console.error('❌ No user returned from auth signup');
        throw new Error('Failed to create user');
      }

      console.log('✅ Auth user created, ID:', authData.user.id);
      console.log('📝 Session exists:', !!authData.session);

      // Note: User record should be created by Supabase trigger
      // If you need to manually create it, ensure RLS policies allow it
      
      console.log('🎉 Registration complete, returning data');
      return authData;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  },

  /**
   * Authenticates a user with email and password
   */
  async login(credentials: { email: string; password: string }) {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

      if (authError) {
        if (authError.message === 'Email not confirmed') {
          throw new Error(
            'Please confirm your email address before signing in. Check your email for a confirmation link.'
          );
        }
        if (authError.message === 'Invalid login credentials') {
          throw new Error(
            'Invalid email or password. If you just registered, please check your email for a confirmation link first.'
          );
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Retry fetching user data to account for trigger delay
      let userRecord = null;
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (data) {
          userRecord = data;
          break;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Failed to fetch user data on login:', error);
          throw new Error('Failed to fetch user data after login.');
        }

        if (i < 2) {
          console.log(`User record not found, retrying... (attempt ${i + 2})`);
          await new Promise((res) => setTimeout(res, 500));
        }
      }

      if (!userRecord) {
        console.error('❌ Failed to fetch user data after multiple attempts.');
        throw new Error('Could not retrieve user profile after login.');
      }

      return {
        user: userRecord,
        token: authData.session?.access_token || '',
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Google OAuth login - Not yet implemented
   * TODO: Implement Google OAuth login flow
   * For now, users should sign up with email/password and connect Google Calendar separately
   */
  async loginWithGoogle() {
    throw new Error('Google OAuth login is not yet implemented. Please sign up with email and password, then connect your Google Calendar from the dashboard.');
  },

  /**
   * Handles the OAuth callback after successful authentication
   */
  async handleOAuthCallback() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        throw new Error('No session found after OAuth callback');
      }

      console.log('🔍 OAuth user metadata:', session.user.user_metadata);

      const googleProfile = session.user.user_metadata;
      const fullName = googleProfile?.full_name || googleProfile?.name || '';
      const firstName =
        googleProfile?.given_name ||
        googleProfile?.first_name ||
        fullName.split(' ')[0] ||
        '';
      const lastName =
        googleProfile?.family_name ||
        googleProfile?.last_name ||
        fullName.split(' ').slice(1).join(' ') ||
        '';
      const email = session.user.email || '';

      // Check if user profile exists
      let userRecord = null;
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          userRecord = data;
          break;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Failed to fetch user data after OAuth:', error);
          throw new Error('Failed to fetch user data after OAuth login.');
        }

        if (i < 4) {
          console.log(
            `OAuth user record not found, retrying... (attempt ${i + 2})`
          );
          await new Promise((res) => setTimeout(res, 1000));
        }
      }

      // Create user profile if it doesn't exist
      if (!userRecord) {
        console.log('Creating user profile for OAuth user...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            username: '',
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to create OAuth user profile:', insertError);
          throw new Error('Failed to create user profile after OAuth login.');
        }

        userRecord = newUser;
      }

      return {
        user: userRecord,
        token: session.access_token,
      };
    } catch (error) {
      console.error('❌ OAuth callback handling failed:', error);
      throw error;
    }
  },

  /**
   * Retrieves the currently authenticated user's data
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return null;
      }

      const { data: userRecord, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (dbError || !userRecord) {
        return null;
      }

      return userRecord;
    } catch (error) {
      return null;
    }
  },

  /**
   * Logs out the current user
   */
  async logout() {
    try {
      // Add timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
      
      if (error) {
        // Don't throw - allow logout to continue even if Supabase fails
        console.warn('⚠️ Supabase signOut failed, but continuing with local logout');
      }
      return true;
    } catch (error) {
      // Timeout occurred - this is expected on mobile, continue with local logout
      return true;
    }
  },

  /**
   * Updates a user's profile information
   */
  async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      console.log('🔧 Updating user profile:', userId);
      console.log('🔧 Updates:', updates);

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ Failed to update user profile:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Exception in updateUserProfile:', error);
      throw error;
    }
  },
};
