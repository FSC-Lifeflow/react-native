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

export interface CalendarEventConflict {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export interface CreateEventParams {
  userId: string;
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  location?: string;
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
   * Creates a new event in the user's Google Calendar
   */
  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/google/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          summary: params.summary,
          description: params.description,
          start: {
            dateTime: params.startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: params.endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          location: params.location,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create event' }));
        throw new Error(error.message || 'Failed to create calendar event');
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Create calendar event error:', error);
      throw error;
    }
  },

  /**
   * Checks for conflicting events in the user's calendar for a given time range
   */
  async checkConflicts(
    userId: string,
    startTime: string,
    endTime: string
  ): Promise<CalendarEventConflict[]> {
    try {
      const params = new URLSearchParams({
        userId,
        timeMin: startTime,
        timeMax: endTime,
      });

      const response = await fetch(`${API_BASE_URL}/api/google/calendar/events?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated with Google Calendar');
        }
        throw new Error('Failed to check calendar conflicts');
      }

      const data = await response.json();
      const events = data.items || [];

      // Filter events that overlap with the requested time range
      const conflicts: CalendarEventConflict[] = events
        .filter((event: any) => {
          const eventStart = event.start.dateTime || event.start.date;
          const eventEnd = event.end.dateTime || event.end.date;
          
          const eventStartTime = new Date(eventStart).getTime();
          const eventEndTime = new Date(eventEnd).getTime();
          const rangeStartTime = new Date(startTime).getTime();
          const rangeEndTime = new Date(endTime).getTime();
          
          const overlaps = eventStartTime < rangeEndTime && rangeStartTime < eventEndTime;
          return overlaps;
        })
        .map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          location: event.location,
        }));

      return conflicts;
    } catch (error) {
      console.error('Check calendar conflicts error:', error);
      throw error;
    }
  },

  /**
   * Deletes an event from the user's Google Calendar
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/google/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete event' }));
        throw new Error(error.message || 'Failed to delete calendar event');
      }
    } catch (error) {
      console.error('Delete calendar event error:', error);
      throw error;
    }
  },

  /**
   * Updates an existing event in the user's Google Calendar
   */
  async updateEvent(
    userId: string,
    eventId: string,
    params: Partial<CreateEventParams>
  ): Promise<CalendarEvent> {
    try {
      const updateData: any = {
        userId,
      };

      if (params.summary) updateData.summary = params.summary;
      if (params.description) updateData.description = params.description;
      if (params.location) updateData.location = params.location;
      
      if (params.startTime) {
        updateData.start = {
          dateTime: params.startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      
      if (params.endTime) {
        updateData.end = {
          dateTime: params.endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/google/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update event' }));
        throw new Error(error.message || 'Failed to update calendar event');
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Update calendar event error:', error);
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
