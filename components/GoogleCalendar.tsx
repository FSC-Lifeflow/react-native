import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useGoogleCalendarOAuth } from '@/hooks/useGoogleCalendarOAuth';
import { CalendarEvent } from '@/services/googleCalendarService';
import { Card } from '@/components/ui/Card';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GoogleCalendarProps {
  className?: string;
}

export function GoogleCalendar({ className }: GoogleCalendarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const { initiateOAuth, isLoading: oauthLoading } = useGoogleCalendarOAuth();
  const { 
    isAuthenticated, 
    events, 
    isLoading, 
    error, 
    signOut, 
    refreshEvents 
  } = useGoogleCalendar();

  const handleConnect = async () => {
    await initiateOAuth();
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const startDate = parseISO(event.start.dateTime);
      const endDate = parseISO(event.end.dateTime!);
      
      let datePrefix = "";
      if (isToday(startDate)) {
        datePrefix = "Today ";
      } else if (isTomorrow(startDate)) {
        datePrefix = "Tomorrow ";
      } else {
        datePrefix = format(startDate, "MMM d ");
      }
      
      return `${datePrefix}${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
    } else if (event.start.date) {
      const date = parseISO(event.start.date);
      if (isToday(date)) {
        return "Today (All day)";
      } else if (isTomorrow(date)) {
        return "Tomorrow (All day)";
      } else {
        return `${format(date, "MMM d")} (All day)`;
      }
    }
    return "No time specified";
  };

  const getEventTypeInfo = (summary: string) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('workout') || lowerSummary.includes('gym') || lowerSummary.includes('exercise')) {
      return { label: 'Workout', color: colors.tint };
    } else if (lowerSummary.includes('meeting') || lowerSummary.includes('call')) {
      return { label: 'Meeting', color: '#3b82f6' };
    } else if (lowerSummary.includes('yoga') || lowerSummary.includes('meditation')) {
      return { label: 'Wellness', color: '#10b981' };
    }
    return { label: 'Event', color: colors.mutedForeground };
  };

  // Show connect screen if not authenticated
  if (!isAuthenticated) {
    return (
      <Card style={styles.connectCard}>
        <View style={styles.connectIconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.tint }]}>
            <Ionicons name="calendar" size={32} color="#fff" />
          </View>
        </View>
        <Text style={[styles.connectTitle, { color: colors.foreground }]}>
          Google Calendar Integration
        </Text>
        <Text style={[styles.connectDescription, { color: colors.mutedForeground }]}>
          View all your events, meetings, and AI-scheduled workouts in one place
        </Text>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: colors.tint }]}
          onPress={handleConnect}
          disabled={oauthLoading}
        >
          {oauthLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
          )}
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Your Calendar</Text>
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedBadgeText}>Connected</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={refreshEvents}
            disabled={isLoading}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={colors.foreground}
              style={isLoading ? styles.spinning : undefined}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={signOut}
          >
            <Text style={[styles.disconnectText, { color: colors.foreground }]}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {isLoading && events.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading your events...
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No upcoming events in the next 7 days
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.eventsList}
          showsVerticalScrollIndicator={false}
        >
          {events.slice(0, 5).map((event) => {
            const eventType = getEventTypeInfo(event.summary);
            return (
              <Card key={event.id} style={styles.eventCard}>
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text 
                      style={[styles.eventTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {event.summary}
                    </Text>
                    <View style={[styles.eventBadge, { backgroundColor: eventType.color + '20' }]}>
                      <Text style={[styles.eventBadgeText, { color: eventType.color }]}>
                        {eventType.label}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetailItem}>
                      <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.eventDetailText, { color: colors.mutedForeground }]}>
                        {formatEventTime(event)}
                      </Text>
                    </View>
                    
                    {event.location && (
                      <View style={styles.eventDetailItem}>
                        <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                        <Text 
                          style={[styles.eventDetailText, { color: colors.mutedForeground }]}
                          numberOfLines={1}
                        >
                          {event.location}
                        </Text>
                      </View>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <View style={styles.eventDetailItem}>
                        <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.eventDetailText, { color: colors.mutedForeground }]}>
                          {event.attendees.length} attendees
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {event.description && (
                    <Text 
                      style={[styles.eventDescription, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {event.description}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
          
          {events.length > 5 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => Linking.openURL('https://calendar.google.com')}
            >
              <Ionicons name="open-outline" size={16} color={colors.tint} />
              <Text style={[styles.viewAllText, { color: colors.tint }]}>
                View all {events.length} events in Google Calendar
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  connectCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  connectIconContainer: {
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  connectDescription: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  connectButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
  },
  connectedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  connectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  spinning: {
    // Animation would be added via Animated API if needed
  },
  disconnectText: {
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#fef2f2',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  eventsList: {
    flex: 1,
  },
  eventCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  eventContent: {
    gap: Spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  eventBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDetails: {
    gap: Spacing.xs,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
    flex: 1,
  },
  eventDescription: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  viewAllText: {
    fontSize: 14,
  },
});
