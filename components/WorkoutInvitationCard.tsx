import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/Card';
import { messageService, WorkoutInvitationData } from '@/services/messageService';
import { Alert } from 'react-native';

interface Participant {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

interface WorkoutInvitationCardProps {
  messageId: string;
  workoutData: WorkoutInvitationData;
  senderId: string;
  senderName: string;
  currentUserId: string;
  participants: Participant[];
}

export function WorkoutInvitationCard({
  messageId,
  workoutData,
  senderId,
  senderName,
  currentUserId,
  participants,
}: WorkoutInvitationCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isResponding, setIsResponding] = useState(false);

  const isOwnInvitation = senderId === currentUserId;
  const hasAccepted = workoutData.accepted_by?.includes(currentUserId);
  const hasDeclined = workoutData.declined_by?.includes(currentUserId);
  const hasResponded = hasAccepted || hasDeclined;

  const startDate = workoutData.event_start ? new Date(workoutData.event_start) : null;
  const endDate = workoutData.event_end ? new Date(workoutData.event_end) : null;

  const handleResponse = async (action: 'accept' | 'decline') => {
    try {
      setIsResponding(true);
      console.log('🎯 Updating workout invitation response:', { messageId, currentUserId, action });

      await messageService.updateWorkoutInvitationResponse(messageId, currentUserId, action);

      console.log('✅ Workout invitation response updated successfully');

      Alert.alert(
        'Success',
        action === 'accept'
          ? '✅ You accepted the workout invitation!'
          : '❌ You declined the workout invitation'
      );
    } catch (error: any) {
      console.error('❌ Error responding to invitation:', error);
      Alert.alert('Error', 'Failed to respond to invitation. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const getParticipantName = (userId: string) => {
    const participant = participants.find(p => p.id === userId);
    if (!participant) return 'Someone';
    return participant.first_name && participant.last_name
      ? `${participant.first_name} ${participant.last_name}`
      : participant.username;
  };

  const acceptedCount = workoutData.accepted_by?.length || 0;
  const declinedCount = workoutData.declined_by?.length || 0;
  const acceptedParticipants = workoutData.accepted_by?.map(getParticipantName) || [];
  const declinedParticipants = workoutData.declined_by?.map(getParticipantName) || [];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card style={styles.container}>
      <View style={[styles.cardBorder, { borderColor: colors.tint }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
          <Ionicons name="calendar" size={24} color={colors.tint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {workoutData.event_summary}
          </Text>
          <Text style={[styles.subtitle, { color: colors.foreground, opacity: 0.6 }]}>
            Invited by {senderName}
          </Text>
        </View>
      </View>

      {/* Event Details */}
      <View style={styles.details}>
        {startDate && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.foreground} style={{ opacity: 0.6 }} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>
              {formatDate(startDate)} • {formatTime(startDate)}
              {endDate && ` - ${formatTime(endDate)}`}
            </Text>
          </View>
        )}

        {workoutData.event_location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.foreground} style={{ opacity: 0.6 }} />
            <Text style={[styles.detailText, { color: colors.foreground }]} numberOfLines={1}>
              {workoutData.event_location}
            </Text>
          </View>
        )}

        {workoutData.event_description && (
          <Text style={[styles.description, { color: colors.foreground, opacity: 0.7 }]} numberOfLines={2}>
            {workoutData.event_description}
          </Text>
        )}
      </View>

      {/* Participant Responses */}
      {(acceptedCount > 0 || declinedCount > 0) && (
        <View style={[styles.responses, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {acceptedCount > 0 && (
            <View style={styles.responseRow}>
              <View style={styles.responseHeader}>
                <View style={[styles.responseIcon, { backgroundColor: '#34c759' + '20' }]}>
                  <Ionicons name="checkmark" size={12} color="#34c759" />
                </View>
                <Text style={[styles.responseLabel, { color: '#34c759' }]}>Accepted</Text>
              </View>
              <Text style={[styles.responseNames, { color: colors.foreground, opacity: 0.7 }]} numberOfLines={2}>
                {acceptedParticipants.join(', ')}
              </Text>
            </View>
          )}

          {declinedCount > 0 && (
            <View style={styles.responseRow}>
              <View style={styles.responseHeader}>
                <View style={[styles.responseIcon, { backgroundColor: '#ff3b30' + '20' }]}>
                  <Ionicons name="close" size={12} color="#ff3b30" />
                </View>
                <Text style={[styles.responseLabel, { color: '#ff3b30' }]}>Declined</Text>
              </View>
              <Text style={[styles.responseNames, { color: colors.foreground, opacity: 0.7 }]} numberOfLines={2}>
                {declinedParticipants.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {!isOwnInvitation && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {hasResponded ? (
            <View style={styles.respondedContainer}>
              <View style={styles.respondedStatus}>
                <Ionicons
                  name={hasAccepted ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={hasAccepted ? '#34c759' : '#ff3b30'}
                />
                <Text
                  style={[
                    styles.respondedText,
                    { color: hasAccepted ? '#34c759' : '#ff3b30' },
                  ]}
                >
                  You {hasAccepted ? 'accepted' : 'declined'} this invitation
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleResponse(hasAccepted ? 'decline' : 'accept')}
                disabled={isResponding}
              >
                <Text style={[styles.changeResponse, { color: colors.tint }]}>
                  Change Response
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, { backgroundColor: '#34c759' }]}
                onPress={() => handleResponse('accept')}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton, { borderColor: '#ff3b30' }]}
                onPress={() => handleResponse('decline')}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#ff3b30" />
                ) : (
                  <>
                    <Ionicons name="close" size={20} color="#ff3b30" />
                    <Text style={[styles.actionButtonText, { color: '#ff3b30' }]}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Own Invitation Status */}
      {isOwnInvitation && (
        <View style={[styles.ownInvitation, { borderTopColor: colors.border }]}>
          <Text style={[styles.ownInvitationText, { color: colors.foreground, opacity: 0.6 }]}>
            You sent this invitation
          </Text>
        </View>
      )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  cardBorder: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
  },
  details: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailText: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  description: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  responses: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  responseRow: {
    marginBottom: Spacing.sm,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  responseIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  responseLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  responseNames: {
    ...Typography.caption,
    marginLeft: 28,
  },
  actions: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  respondedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  respondedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  respondedText: {
    ...Typography.caption,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  changeResponse: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  ownInvitation: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  ownInvitationText: {
    ...Typography.caption,
  },
});
