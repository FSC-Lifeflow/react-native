import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

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
        console.log('AuthContext - Starting auth check...');
        const currentUser = await Promise.race([
          authService.getCurrentUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth check timeout')), 3000)
          )
        ]);
        console.log('AuthContext - Auth check complete, user:', currentUser ? 'exists' : 'null');
        setUser(currentUser as User | null);
      } catch (err) {
        // Timeout or error - assume no user and continue
        console.log('AuthContext - No cached session found, continuing as logged out');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.login({ email, password });
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
