import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { googleCalendarService } from './googleCalendarService';

/**
 * Co-Workout Service
 * Handles workout invitations, challenges, and co-workout sessions
 */

export type WorkoutSessionStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
export type WorkoutChallengeStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

export type WorkoutSession = {
  id: string;
  creator_id: string;
  participant_id: string;
  workout_type: string;
  scheduled_date: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  status: WorkoutSessionStatus;
  created_at: string;
  updated_at: string;
};

export type WorkoutChallenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  workout_type: string;
  challenge_date: string;
  challenge_metric: string;
  challenger_result?: number;
  challenged_result?: number;
  status: WorkoutChallengeStatus;
  created_at: string;
  updated_at: string;
};

export const coWorkoutService = {
  /**
   * Accepts a workout invitation and adds it to Google Calendar
   */
  async acceptWorkoutInvitation(
    invitationData: {
      inviter_id: string;
      inviter_name: string;
      workout_type: string;
      workout_place?: string;
      workout_note?: string;
    },
    scheduledTime: string,
    duration: number
  ): Promise<string> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Calculate end time
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event
    const calendarEvent = await googleCalendarService.createEvent({
      userId: currentUser.id,
      summary: `Workout with ${invitationData.inviter_name}: ${invitationData.workout_type}`,
      description: invitationData.workout_note || `Co-workout session with ${invitationData.inviter_name}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: invitationData.workout_place,
    });

    // Send notification to inviter
    await notificationService.createNotification({
      user_id: invitationData.inviter_id,
      type: 'workout_invitation_accepted',
      title: 'Invitation Accepted!',
      message: `${currentUser.user_metadata?.first_name || 'Someone'} accepted your ${invitationData.workout_type} workout invitation!`,
      read: false,
      data: {
        accepted_by_id: currentUser.id,
        scheduled_time: scheduledTime,
        workout_type: invitationData.workout_type,
      },
    });

    return calendarEvent.id;
  },

  /**
   * Accepts a workout challenge and adds it to Google Calendar
   */
  async acceptWorkoutChallenge(
    challengeId: string,
    scheduledTime: string,
    duration: number
  ): Promise<string> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Get challenge details
    const { data: challenge, error: fetchError } = await supabase
      .from('workout_challenges')
      .select(`
        *,
        challenger:users!challenger_id(id, first_name, last_name, username)
      `)
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      throw new Error('Challenge not found');
    }

    // Verify user is the challenged person
    if (challenge.challenged_id !== currentUser.id) {
      throw new Error('You are not authorized to accept this challenge');
    }

    // Calculate end time
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event
    const calendarEvent = await googleCalendarService.createEvent({
      userId: currentUser.id,
      summary: `Workout Challenge: ${challenge.workout_form || challenge.workout_type}`,
      description: `Challenge from ${challenge.challenger.first_name} ${challenge.challenger.last_name}\n\n${challenge.workout_note || ''}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: challenge.location,
    });

    // Update challenge status
    const { error: updateError } = await supabase
      .from('workout_challenges')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        scheduled_time: scheduledTime,
        workout_duration: duration,
        calendar_event_id: calendarEvent.id,
      })
      .eq('id', challengeId);

    if (updateError) {
      // Try to clean up calendar event if database update fails
      try {
        await googleCalendarService.deleteEvent(currentUser.id, calendarEvent.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup calendar event:', cleanupError);
      }
      throw new Error('Failed to accept challenge');
    }

    // Send notification to challenger
    await notificationService.createNotification({
      user_id: challenge.challenger_id,
      type: 'workout_challenge_accepted',
      title: 'Challenge Accepted!',
      message: `${currentUser.user_metadata?.first_name || 'Someone'} accepted your ${challenge.workout_form || challenge.workout_type} challenge!`,
      read: false,
      data: {
        challenge_id: challengeId,
        accepted_by_id: currentUser.id,
        scheduled_time: scheduledTime,
      },
    });

    return calendarEvent.id;
  },

  /**
   * Creates a workout challenge
   */
  async createWorkoutChallenge(
    challengedId: string,
    workoutForm: string,
    timeOption: 'set' | 'flexible',
    options?: {
      workoutTime?: string;
      workoutDuration?: number;
      workoutNote?: string;
    }
  ): Promise<WorkoutChallenge> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('workout_challenges')
      .insert({
        challenger_id: currentUser.id,
        challenged_id: challengedId,
        workout_type: workoutForm,
        workout_form: workoutForm,
        time_option: timeOption,
        scheduled_time: options?.workoutTime || null,
        workout_duration: options?.workoutDuration || null,
        workout_note: options?.workoutNote || null,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  },
};
