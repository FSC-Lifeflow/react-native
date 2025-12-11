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

interface WorkoutInvitationAcceptDialogProps {
  visible: boolean;
  onClose: () => void;
  invitationData: {
    inviter_name: string;
    workout_type: string;
    workout_time: string;
    workout_duration: number;
    workout_place?: string;
    workout_note?: string;
  };
  onAccept: (scheduledTime: string, duration: number) => Promise<void>;
}

type DialogStep = 'time-selection' | 'conflict-check' | 'confirm';

export function WorkoutInvitationAcceptDialog({
  visible,
  onClose,
  invitationData,
  onAccept,
}: WorkoutInvitationAcceptDialogProps) {
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

  useEffect(() => {
    if (!visible) return;
    const suggestedDate = new Date(invitationData.workout_time);
    setSelectedDate(suggestedDate);
    setSelectedTime(suggestedDate);
    setDuration(invitationData.workout_duration);
    setStep('time-selection');
    setConflicts([]);
    setError(null);
    setUserInteracted(false);
  }, [invitationData]);

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
    setStep('confirm');
  };

  const handleAccept = async () => {
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
      await onAccept(scheduledTime, duration);
      onClose();
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = () => {
    setStep('time-selection');
    setConflicts([]);
    setError(null);
    setUserInteracted(false);
    onClose();
  };

  const formatTimeOnly = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Accept Workout Invitation</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.foreground, opacity: 0.7 }]}>
            {invitationData.inviter_name} invited you to a {invitationData.workout_type} workout
          </Text>
          {error && (
            <View style={[styles.alert, styles.alertError]}>
              <Ionicons name="alert-circle" size={20} color="#ff3b30" />
              <Text style={[styles.alertText, { color: '#ff3b30' }]}>{error}</Text>
            </View>
          )}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'time-selection' && (
              <View style={styles.stepContent}>
                <View style={[styles.infoBox, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '40' }]}>
                  <Ionicons name="calendar" size={20} color={colors.tint} />
                  <Text style={[styles.infoText, { color: colors.foreground }]}>
                    Suggested time: {new Date(invitationData.workout_time).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: colors.foreground }}>
                      {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
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
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Time</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={{ color: colors.foreground }}>{formatTimeOnly(selectedTime)}</Text>
                    <Ionicons name="time-outline" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                {showTimePicker && (
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
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Duration (minutes)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    value={duration.toString()}
                    onChangeText={(text) => setDuration(parseInt(text) || 60)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}
          </ScrollView>
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '90%', minHeight: '60%', paddingTop: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  title: { ...Typography.h3, fontWeight: '600' },
  subtitle: { ...Typography.body, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  stepContent: { paddingBottom: Spacing.lg },
  alert: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, gap: Spacing.sm },
  alertError: { backgroundColor: '#ff3b30' + '20' },
  alertText: { flex: 1, fontSize: 14, fontWeight: '500' },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md, gap: Spacing.sm },
  infoText: { fontSize: 14, flex: 1 },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm },
  input: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, fontSize: 16 },
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.1)' },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, minHeight: 48 },
  buttonPrimary: {},
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
