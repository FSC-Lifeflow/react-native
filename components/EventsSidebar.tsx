import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useGoogleCalendarOAuth } from '@/hooks/useGoogleCalendarOAuth';
import { CalendarEvent } from '@/services/googleCalendarService';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface EventsSidebarProps {
  onEventSelect: (eventId: string | null) => void;
  selectedEventId: string | null;
  onClose?: () => void;
}

export function EventsSidebar({ onEventSelect, selectedEventId, onClose }: EventsSidebarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { initiateOAuth, isLoading: oauthLoading } = useGoogleCalendarOAuth();
  const { isAuthenticated, events, isLoading, error, signOut, refreshEvents } = useGoogleCalendar();

  const handleEventClick = (eventId: string) => {
    const newSelectedId = eventId === selectedEventId ? null : eventId;
    onEventSelect(newSelectedId);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const startDate = parseISO(event.start.dateTime);
      const endDate = parseISO(event.end.dateTime!);
      
      let datePrefix = '';
      if (isToday(startDate)) {
        datePrefix = 'Today ';
      } else if (isTomorrow(startDate)) {
        datePrefix = 'Tomorrow ';
      } else {
        datePrefix = format(startDate, 'MMM d ');
      }
      
      return `${datePrefix}${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    } else if (event.start.date) {
      const date = parseISO(event.start.date);
      if (isToday(date)) return 'Today (All day)';
      if (isTomorrow(date)) return 'Tomorrow (All day)';
      return `${format(date, 'MMM d')} (All day)`;
    }
    return 'No time specified';
  };

  const getEventTypeLabel = (summary: string) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('workout') || lowerSummary.includes('gym') || lowerSummary.includes('exercise')) {
      return 'Workout';
    } else if (lowerSummary.includes('meeting') || lowerSummary.includes('call')) {
      return 'Meeting';
    } else if (lowerSummary.includes('yoga') || lowerSummary.includes('meditation')) {
      return 'Wellness';
    }
    return 'Event';
  };

  // Not authenticated - show connect screen
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Calendar Events</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.connectContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </View>
          <Text style={[styles.connectTitle, { color: colors.foreground }]}>
            Calendar Events
          </Text>
          <Text style={[styles.connectText, { color: colors.mutedForeground }]}>
            Connect to view and select events for your chat
          </Text>
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={initiateOAuth}
            disabled={oauthLoading}
          >
            {oauthLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>Connect Calendar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authenticated - show events list
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.foreground }]}>Calendar Events</Text>
          <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.badgeText}>Connected</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={refreshEvents} 
            disabled={isLoading} 
            style={styles.iconButton}
          >
            <Ionicons 
              name="refresh" 
              size={18} 
              color={isLoading ? colors.mutedForeground : colors.foreground} 
            />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
          <Ionicons name="alert-circle" size={14} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Events List */}
      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {isLoading && events.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Loading events...
            </Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No upcoming events
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[
                styles.eventCard,
                { 
                  borderColor: selectedEventId === event.id ? colors.primary : colors.border,
                  backgroundColor: selectedEventId === event.id ? `${colors.primary}10` : colors.card,
                },
              ]}
              onPress={() => handleEventClick(event.id)}
              activeOpacity={0.7}
            >
              <View style={styles.eventContent}>
                <View style={styles.eventTitleRow}>
                  <Text 
                    style={[styles.eventTitle, { color: colors.foreground }]} 
                    numberOfLines={1}
                  >
                    {event.summary}
                  </Text>
                  <View style={[styles.eventTypeBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.eventTypeText, { color: colors.mutedForeground }]}>
                      {getEventTypeLabel(event.summary)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.eventTime}>
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.eventTimeText, { color: colors.mutedForeground }]}>
                    {formatEventTime(event)}
                  </Text>
                </View>
                
                {event.location && (
                  <View style={styles.eventLocation}>
                    <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                    <Text 
                      style={[styles.eventLocationText, { color: colors.mutedForeground }]} 
                      numberOfLines={1}
                    >
                      {event.location}
                    </Text>
                  </View>
                )}
                
                {event.attendees && event.attendees.length > 0 && (
                  <View style={styles.eventAttendees}>
                    <Ionicons name="people-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.eventAttendeesText, { color: colors.mutedForeground }]}>
                      {event.attendees.length} attendees
                    </Text>
                  </View>
                )}
              </View>
              
              {selectedEventId === event.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Disconnect Button */}
      <TouchableOpacity style={styles.disconnectButton} onPress={signOut}>
        <Text style={[styles.disconnectText, { color: colors.mutedForeground }]}>
          Disconnect Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '500',
  },
  iconButton: {
    padding: Spacing.xs,
  },
  connectContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  connectTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  connectText: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  connectButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    flex: 1,
  },
  eventsList: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.sm,
  },
  eventCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  eventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  eventTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTimeText: {
    fontSize: 11,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventLocationText: {
    fontSize: 11,
    flex: 1,
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventAttendeesText: {
    fontSize: 11,
  },
  disconnectButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  disconnectText: {
    fontSize: Typography.fontSizes.xs,
  },
});
