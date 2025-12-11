import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { googleCalendarService, CalendarEventConflict } from '@/services/googleCalendarService';
import { supabase } from '@/lib/supabase';

interface WorkoutChallengeAcceptDialogProps {
  visible: boolean;
  onClose: () => void;
  challengeData: {
    challenger_name: string;
    workout_form: string;
    time_option: 'set' | 'flexible';
    workout_time?: string;
    workout_duration?: number;
    workout_note?: string;
  };
  onAccept: (scheduledTime: string, duration: number) => Promise<void>;
}

type DialogStep = 'time-selection' | 'conflict-check' | 'confirm';

export function WorkoutChallengeAcceptDialog({
  visible,
  onClose,
  challengeData,
  onAccept,
}: WorkoutChallengeAcceptDialogProps) {
  console.log('🎨 WorkoutChallengeAcceptDialog rendered:', { visible, challengeData });
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState<DialogStep>('time-selection');
  const [userInteracted, setUserInteracted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [duration, setDuration] = useState(60);
  const [conflicts, setConflicts] = useState<CalendarEventConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize with preset time if available - only when dialog first opens
  useEffect(() => {
    if (!visible) return; // Don't run if dialog is closed
    
    console.log('🔄 Dialog initialization:', { 
      time_option: challengeData.time_option,
      workout_time: challengeData.workout_time 
    });
    
    if (challengeData.time_option === 'set' && challengeData.workout_time) {
      console.log('⏰ Setting up FIXED time challenge');
      const workoutDate = new Date(challengeData.workout_time);
      setSelectedDate(workoutDate);
      setSelectedTime(workoutDate);
      setStep('conflict-check');
      console.log('✅ Step set to: conflict-check');
    } else {
      console.log('🕐 Setting up FLEXIBLE time challenge');
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setSelectedDate(tomorrow);
      setSelectedTime(tomorrow);
      setStep('time-selection');
      console.log('✅ Step set to: time-selection');
    }
    setDuration(challengeData.workout_duration || 60);
    setConflicts([]);
    setError(null);
  }, [challengeData]);

  // Check for conflicts when moving to conflict-check step
  useEffect(() => {
    if (step === 'conflict-check') {
      checkForConflicts();
    }
  }, [step]);

  const checkForConflicts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    setIsCheckingConflicts(true);
    setError(null);

    try {
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const foundConflicts = await googleCalendarService.checkConflicts(
        user.id,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      setConflicts(foundConflicts);
    } catch (err) {
      console.error('Error checking conflicts:', err);
      setError(err instanceof Error ? err.message : 'Failed to check calendar conflicts');
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleNext = () => {
    console.log('➡️ handleNext called - moving to conflict-check');
    console.trace('Next button call stack');
    setUserInteracted(true);
    setError(null);
    setStep('conflict-check');
  };

  const handleBack = () => {
    setError(null);
    if (step === 'conflict-check') {
      setStep('time-selection');
    } else if (step === 'confirm') {
      setStep('conflict-check');
    }
  };

  const handleProceedWithConflicts = () => {
    console.log('⚠️ handleProceedWithConflicts called - moving to confirm');
    console.trace('Proceed call stack');
    setStep('confirm');
  };

  const handleAccept = async () => {
    console.log('🎉 handleAccept called! userInteracted:', userInteracted);
    console.trace('Accept call stack');
    
    if (!userInteracted) {
      console.error('❌ BLOCKED: Accept called without user interaction!');
      return;
    }
    
    setIsAccepting(true);
    setError(null);

    try {
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const scheduledTime = startDateTime.toISOString();
      
      console.log('📅 Scheduling workout for:', scheduledTime, 'duration:', duration);

      await onAccept(scheduledTime, duration);
      onClose();
    } catch (err) {
      console.error('Error accepting challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept challenge');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = () => {
    console.log('🚫 handleCancel called');
    console.trace('Cancel call stack');
    setStep('time-selection');
    setConflicts([]);
    setError(null);
    onClose();
  };

  const formatConflictTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (date: Date, time: Date) => {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeOnly = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isTimeFixed = challengeData.time_option === 'set';

  console.log('🎬 Dialog render - visible:', visible, 'step:', step);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Accept Workout Challenge
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.foreground, opacity: 0.7 }]}>
            {challengeData.challenger_name} challenged you to a {challengeData.workout_form} workout
          </Text>

          {/* Error Alert */}
          {error && (
            <View style={[styles.alert, styles.alertError]}>
              <Ionicons name="alert-circle" size={20} color="#ff3b30" />
              <Text style={[styles.alertText, { color: '#ff3b30' }]}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {(() => {
              console.log('📍 Current step being rendered:', step);
              return null;
            })()}
            {/* Step 1: Time Selection */}
            {step === 'time-selection' && (
              <View style={styles.stepContent}>
                {(() => {
                  console.log('✅ TIME SELECTION UI RENDERING - isTimeFixed:', isTimeFixed);
                  return null;
                })()}
                {isTimeFixed ? (
                  <View style={[styles.infoBox, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '40' }]}>
                    <Ionicons name="calendar" size={20} color={colors.tint} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>
                      This challenge is scheduled for{' '}
                      <Text style={{ fontWeight: '600' }}>
                        {challengeData.workout_time && new Date(challengeData.workout_time).toLocaleString()}
                      </Text>
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.infoBox, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '40' }]}>
                    <Ionicons name="time" size={20} color={colors.tint} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>
                      This challenge is flexible. Choose when you'd like to schedule it.
                    </Text>
                  </View>
                )}

                {/* Date Picker */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isTimeFixed && styles.inputDisabled,
                    ]}
                    onPress={() => !isTimeFixed && setShowDatePicker(true)}
                    disabled={isTimeFixed}
                  >
                    <Text style={{ color: colors.foreground, opacity: isTimeFixed ? 0.5 : 1 }}>
                      {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.foreground} style={{ opacity: isTimeFixed ? 0.5 : 1 }} />
                  </TouchableOpacity>
                </View>

                {showDatePicker && !isTimeFixed && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setSelectedDate(date);
                    }}
                    minimumDate={new Date()}
                  />
                )}

                {/* Time Picker */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Time</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isTimeFixed && styles.inputDisabled,
                    ]}
                    onPress={() => !isTimeFixed && setShowTimePicker(true)}
                    disabled={isTimeFixed}
                  >
                    <Text style={{ color: colors.foreground, opacity: isTimeFixed ? 0.5 : 1 }}>
                      {formatTimeOnly(selectedTime)}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={colors.foreground} style={{ opacity: isTimeFixed ? 0.5 : 1 }} />
                  </TouchableOpacity>
                </View>

                {showTimePicker && !isTimeFixed && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, time) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (time) setSelectedTime(time);
                    }}
                  />
                )}

                {/* Duration */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Duration (minutes)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    value={duration.toString()}
                    onChangeText={(text) => setDuration(parseInt(text) || 60)}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="information-circle" size={16} color={colors.foreground} style={{ opacity: 0.6 }} />
                  <Text style={[styles.infoText, { color: colors.foreground, fontSize: 12 }]}>
                    We'll check your Google Calendar for conflicts before scheduling this workout.
                  </Text>
                </View>

                {challengeData.workout_note && (
                  <View style={[styles.detailBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.noteLabel, { color: colors.foreground }]}>Note from challenger:</Text>
                    <Text style={[styles.noteText, { color: colors.foreground, opacity: 0.7 }]}>{challengeData.workout_note}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 2: Conflict Check */}
            {step === 'conflict-check' && (
              <View style={styles.stepContent}>
                {isCheckingConflicts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                    <Text style={[styles.loadingText, { color: colors.foreground }]}>Checking your calendar...</Text>
                  </View>
                ) : conflicts.length > 0 ? (
                  <>
                    <View style={[styles.alert, styles.alertWarning]}>
                      <Ionicons name="warning" size={20} color="#ff9500" />
                      <Text style={[styles.alertText, { color: '#ff9500' }]}>
                        You have {conflicts.length} conflicting event{conflicts.length > 1 ? 's' : ''} at this time
                      </Text>
                    </View>

                    <View style={styles.conflictsList}>
                      {conflicts.map((conflict) => (
                        <View
                          key={conflict.id}
                          style={[styles.conflictItem, { backgroundColor: '#ff3b30' + '10', borderColor: '#ff3b30' + '40' }]}
                        >
                          <Text style={[styles.conflictTitle, { color: colors.foreground }]}>{conflict.summary}</Text>
                          <Text style={[styles.conflictTime, { color: colors.foreground, opacity: 0.7 }]}>
                            {formatConflictTime(conflict.start)} - {formatConflictTime(conflict.end)}
                          </Text>
                          {conflict.location && (
                            <Text style={[styles.conflictLocation, { color: colors.foreground, opacity: 0.7 }]}>
                              📍 {conflict.location}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.infoText, { color: colors.foreground }]}>
                        You can either go back to choose a different time, or proceed to override these events.
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.alert, styles.alertSuccess]}>
                    <Ionicons name="checkmark-circle" size={20} color="#34c759" />
                    <Text style={[styles.alertText, { color: '#34c759' }]}>
                      No conflicts found! Your calendar is free at this time.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <View style={styles.stepContent}>
                <View style={[styles.alert, styles.alertSuccess]}>
                  <Ionicons name="checkmark-circle" size={20} color="#34c759" />
                  <Text style={[styles.alertText, { color: '#34c759' }]}>
                    Ready to add this workout to your calendar
                  </Text>
                </View>

                <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="calendar" size={20} color={colors.foreground} style={{ opacity: 0.6 }} />
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {formatDateTime(selectedDate, selectedTime)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Ionicons name="time" size={20} color={colors.foreground} style={{ opacity: 0.6 }} />
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {formatTimeOnly(selectedTime)} ({duration} minutes)
                    </Text>
                  </View>
                </View>

                {conflicts.length > 0 && (
                  <View style={[styles.alert, styles.alertWarning]}>
                    <Ionicons name="warning" size={20} color="#ff9500" />
                    <Text style={[styles.alertText, { color: '#ff9500' }]}>
                      Warning: This will be scheduled despite {conflicts.length} conflicting event{conflicts.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === 'time-selection' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                  onPress={handleCancel}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                  <Text style={[styles.buttonText, { color: colors.foreground, marginLeft: 8 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.tint }]}
                  onPress={handleNext}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Next</Text>
                  <Ionicons name="calendar" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </>
            )}

            {step === 'conflict-check' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                  onPress={handleBack}
                  disabled={isCheckingConflicts}
                >
                  <Text style={[styles.buttonText, { color: colors.foreground }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.tint }]}
                  onPress={conflicts.length > 0 ? handleProceedWithConflicts : () => setStep('confirm')}
                  disabled={isCheckingConflicts}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    {conflicts.length > 0 ? 'Proceed Anyway' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'confirm' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                  onPress={handleBack}
                  disabled={isAccepting}
                >
                  <Text style={[styles.buttonText, { color: colors.foreground }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: '#34c759' }]}
                  onPress={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={[styles.buttonText, { color: '#fff', marginLeft: 8 }]}>Accept Challenge</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    minHeight: '60%',
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    fontWeight: '600',
  },
  subtitle: {
    ...Typography.body,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContent: {
    paddingBottom: Spacing.lg,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  alertError: {
    backgroundColor: '#ff3b30' + '20',
  },
  alertWarning: {
    backgroundColor: '#ff9500' + '20',
  },
  alertSuccess: {
    backgroundColor: '#34c759' + '20',
  },
  alertText: {
    ...Typography.body,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  detailBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  noteLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  noteText: {
    ...Typography.caption,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
  },
  conflictsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  conflictItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  conflictTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  conflictTime: {
    ...Typography.caption,
  },
  conflictLocation: {
    ...Typography.caption,
    marginTop: 4,
  },
  summaryBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    ...Typography.body,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonPrimary: {
    // backgroundColor set dynamically
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
