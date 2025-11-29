import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Google Calendar Event Types
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  hasRefreshToken: boolean;
  isExpired: boolean;
}

/**
 * Google Calendar Service
 * Handles all Google Calendar API interactions
 */
export const googleCalendarService = {
  /**
   * Check if user has connected Google Calendar
   */
  async checkConnectionStatus(userId: string): Promise<ConnectionStatus | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No token found, not an error
          return null;
        }
        console.error('Error fetching Google Calendar token:', error);
        return null;
      }

      if (!data) return null;

      const expiresAt = (data as any).expires_at || (data as any).access_token_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
      const hasRefreshToken = Boolean((data as any).refresh_token);

      return {
        connected: true,
        hasRefreshToken,
        isExpired,
      };
    } catch (error) {
      console.error('Connection status check error:', error);
      return null;
    }
  },

  /**
   * Fetch calendar events from backend
   */
  async fetchEvents(userId: string): Promise<{ events: CalendarEvent[]; calendars: CalendarInfo[] }> {
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // Next 7 days

      const params = new URLSearchParams({
        userId,
        timeMin,
        timeMax,
        maxResults: '20',
      });

      const response = await fetch(`${API_BASE_URL}/api/google/calendar/events?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('NOT_AUTHENTICATED');
        }
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      const events = (data.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary || 'No title',
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
        calendarId: event.calendarId,
        calendarName: event.calendarName,
        calendarColor: event.calendarColor,
      }));

      return {
        events,
        calendars: data.calendars || [],
      };
    } catch (error) {
      console.error('Fetch events error:', error);
      throw error;
    }
  },

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/google/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  },
};
