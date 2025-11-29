import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'lifeflow_session';

/**
 * User type definition matching the database schema
 */
type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  social_privacy?: boolean;
  activity_sharing?: boolean;
  avatar_url?: string;
};

/**
 * AuthContextType defines the shape of the authentication context
 */
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * Provides authentication state and methods to child components
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh the current user's profile
   */
  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser as User | null);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  /**
   * Check for existing authentication session on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to restore session from AsyncStorage
        const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionJson) {
          const session = JSON.parse(sessionJson);
          
          // Skip setSession and just fetch user data directly using the stored session
          // Set the session in background without waiting
          supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }).catch(() => {
            // Ignore errors, we'll fetch user data anyway
          });
          
          // Decode the JWT to get user ID without waiting for setSession
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            const userId = payload.sub;
            
            // Fetch user data directly from database
            const { data: userRecord } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (userRecord) {
              setUser(userRecord as User);
            } else {
              await AsyncStorage.removeItem(SESSION_KEY);
              setUser(null);
            }
          } catch (decodeError) {
            // If token is invalid, clear it
            await AsyncStorage.removeItem(SESSION_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('AuthContext - Auth check error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Note: Auth state listener disabled due to React Native hanging issues
    // Session persistence is handled manually in checkAuth and login/logout functions
  }, []);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.login({ email, password });
      
      // Get session from Supabase and save to AsyncStorage
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }));
      }
      
      setUser(user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login using Google OAuth
   */
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.loginWithGoogle();
      setUser(user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Google login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user
   */
  const register = async (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      console.log('AuthContext - Starting registration...');
      const result = await authService.register(userData);
      console.log('AuthContext - Registration result received');
      
      // Check if email confirmation is required
      if (result.user && !result.session) {
        // Email confirmation required - don't auto-login
        console.log('📧 Email confirmation required');
        setLoading(false);
        throw new Error('Please check your email to confirm your account before signing in.');
      }
      
      // If we have a session, user is automatically logged in
      if (result.session && result.user) {
        console.log('✅ User registered and logged in, fetching user data...');
        const currentUser = await authService.getCurrentUser();
        console.log('✅ User data fetched:', currentUser ? 'success' : 'null');
        setUser(currentUser);
      } else {
        // Try to login if no session but user exists
        console.log('⚠️ No session, attempting login...');
        await login(userData.email, userData.password);
      }
      console.log('AuthContext - Registration complete');
    } catch (err) {
      console.error('AuthContext - Registration error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out the current user
   */
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      // Even if logout fails, clear the user state locally
      setUser(null);
      // Don't throw - allow logout to complete
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
