import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WorkoutInvitationData } from '@/services/messageService';

interface SendWorkoutInvitationDialogProps {
  visible: boolean;
  onClose: () => void;
  onSend: (workoutData: WorkoutInvitationData) => Promise<void>;
}

export function SendWorkoutInvitationDialog({
  visible,
  onClose,
  onSend,
}: SendWorkoutInvitationDialogProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutType, setWorkoutType] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!workoutType.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const workoutData: WorkoutInvitationData = {
        event_id: `workout_${Date.now()}`,
        event_summary: workoutType,
        event_start: startDateTime.toISOString(),
        event_end: endDateTime.toISOString(),
        event_location: location || undefined,
        event_description: description || undefined,
        accepted_by: [],
        declined_by: [],
      };

      await onSend(workoutData);
      
      // Reset form
      setWorkoutType('');
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setDuration('60');
      setLocation('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimeOnly = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Send Workout Invitation</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Workout Type */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Workout Type *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={workoutType}
                onChangeText={setWorkoutType}
                placeholder="e.g., Morning Run, Gym Session"
                placeholderTextColor={colors.foreground + '80'}
              />
            </View>

            {/* Date */}
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

            {/* Time */}
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

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Duration (minutes)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.foreground + '80'}
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Location (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Central Park, Gym"
                placeholderTextColor={colors.foreground + '80'}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Note (optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add any additional details..."
                placeholderTextColor={colors.foreground + '80'}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isSending}
            >
              <Text style={[styles.buttonText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, { backgroundColor: workoutType.trim() ? colors.tint : colors.border }]}
              onPress={handleSend}
              disabled={!workoutType.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={[styles.buttonText, { color: '#fff', marginLeft: 8 }]}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>
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
    minHeight: '70%',
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  buttonPrimary: {},
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
