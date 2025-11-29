import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  googleCalendarService, 
  CalendarEvent, 
  CalendarInfo 
} from '@/services/googleCalendarService';

export interface GoogleCalendarState {
  isAuthenticated: boolean;
  events: CalendarEvent[];
  calendars: CalendarInfo[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Google Calendar hook for React Native
 * Manages calendar authentication state and event fetching
 */
export function useGoogleCalendar() {
  const { user } = useAuth();
  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    events: [],
    calendars: [],
    isLoading: false,
    error: null,
  });

  // Check connection status
  const checkConnectionStatus = useCallback(async () => {
    if (!user?.id) {
      return null;
    }

    try {
      const status = await googleCalendarService.checkConnectionStatus(user.id);
      return status;
    } catch (error) {
      console.error('Connection status check error:', error);
      return null;
    }
  }, [user?.id]);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to view calendar events' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { events, calendars } = await googleCalendarService.fetchEvents(user.id);
      
      console.log('Google Calendar Events Fetched:', {
        totalEvents: events.length,
        totalCalendars: calendars.length,
      });
      
      setState(prev => ({ 
        ...prev, 
        events,
        calendars,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Fetch events error:', error);
      
      if (error instanceof Error && error.message === 'NOT_AUTHENTICATED') {
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false,
          error: 'Google Calendar connection expired. Please reconnect.',
          isLoading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to fetch events',
          isLoading: false 
        }));
      }
    }
  }, [user?.id]);

  // Check authentication status on mount and when user changes
  useEffect(() => {
    const initializeAuth = async () => {
      if (!user?.id) {
        setState({
          isAuthenticated: false,
          events: [],
          calendars: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      const status = await checkConnectionStatus();
      
      if (status?.connected && status?.hasRefreshToken) {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        // Fetch events on initialization if connected
        fetchEvents();
      } else {
        setState(prev => ({ ...prev, isAuthenticated: false }));
      }
    };

    initializeAuth();
  }, [user?.id, checkConnectionStatus, fetchEvents]);

  // Sign out / disconnect
  const signOut = useCallback(async () => {
    if (!user?.id) return;

    try {
      await googleCalendarService.disconnect(user.id);

      setState({
        isAuthenticated: false,
        events: [],
        calendars: [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to disconnect' 
      }));
    }
  }, [user?.id]);

  // Refresh events
  const refreshEvents = useCallback(() => {
    if (state.isAuthenticated && user?.id) {
      fetchEvents();
    }
  }, [state.isAuthenticated, user?.id, fetchEvents]);

  return {
    ...state,
    signOut,
    refreshEvents,
  };
}
