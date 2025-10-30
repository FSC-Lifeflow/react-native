import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SettingItem = {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  isSwitch?: boolean;
  showChevron?: boolean;
};

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [notifications, setNotifications] = useState(true);
  const [activitySharing, setActivitySharing] = useState(
    user?.activity_sharing ?? true
  );
  const [socialPrivacy, setSocialPrivacy] = useState(
    user?.social_privacy ?? false
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/sign-in');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const settingsSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: () => router.push('/profile' as any),
          showChevron: true,
        },
        {
          icon: 'key-outline',
          label: 'Change Password',
          onPress: () => Alert.alert('Coming Soon', 'Password change will be available soon'),
          showChevron: true,
        },
        {
          icon: 'mail-outline',
          label: 'Email',
          value: user?.email,
          showChevron: false,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: 'eye-off-outline',
          label: 'Private Profile',
          value: socialPrivacy,
          onToggle: setSocialPrivacy,
          isSwitch: true,
        },
        {
          icon: 'share-social-outline',
          label: 'Activity Sharing',
          value: activitySharing,
          onToggle: setActivitySharing,
          isSwitch: true,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          value: notifications,
          onToggle: setNotifications,
          isSwitch: true,
        },
        {
          icon: 'time-outline',
          label: 'Workout Reminders',
          onPress: () => Alert.alert('Coming Soon', 'Reminder settings will be available soon'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'Integrations',
      items: [
        {
          icon: 'fitness-outline',
          label: 'Fitbit',
          subtitle: 'Not connected',
          onPress: () => Alert.alert('Coming Soon', 'Fitbit integration will be available in Phase 3'),
          showChevron: true,
        },
        {
          icon: 'calendar-outline',
          label: 'Google Calendar',
          subtitle: 'Not connected',
          onPress: () => Alert.alert('Coming Soon', 'Google Calendar integration will be available in Phase 3'),
          showChevron: true,
        },
        {
          icon: 'heart-outline',
          label: 'Apple Health',
          subtitle: 'Not connected',
          onPress: () => Alert.alert('Coming Soon', 'Apple Health integration will be available in Phase 3'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          onPress: () => Alert.alert('Help', 'Visit our help center at help.lifeflow.com'),
          showChevron: true,
        },
        {
          icon: 'chatbubble-outline',
          label: 'Contact Support',
          onPress: () => Alert.alert('Support', 'Email us at support@lifeflow.com'),
          showChevron: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          onPress: () => Alert.alert('Privacy', 'View our privacy policy at lifeflow.com/privacy'),
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Terms of Service',
          onPress: () => Alert.alert('Terms', 'View our terms at lifeflow.com/terms'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'App Version',
          value: '1.0.0',
          showChevron: false,
        },
      ],
    },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.header, { color: colors.foreground }]}>Settings</Text>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
          <Card style={styles.card}>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex}>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={item.onPress}
                  disabled={item.isSwitch || !item.onPress}
                  activeOpacity={item.onPress ? 0.7 : 1}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={colors.mutedForeground}
                      style={styles.settingIcon}
                    />
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.settingRight}>
                    {item.isSwitch ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        trackColor={{ false: colors.border, true: colors.primary + '80' }}
                        thumbColor={item.value ? colors.primary : colors.muted}
                      />
                    ) : item.value && typeof item.value === 'string' ? (
                      <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{item.value}</Text>
                    ) : item.showChevron ? (
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    ) : null}
                  </View>
                </TouchableOpacity>
                {itemIndex < section.items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </Card>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.card }]} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Logout</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Made with ❤️ by the LifeFlow Team
      </Text>
    </ScrollView>
  );
}

// Note: Dynamic colors are applied inline using the colors object
// Static styles use design tokens from the theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    fontSize: Typography.fontSizes['4xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing['2xl'],
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: Spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
  },
  settingSubtitle: {
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: Spacing.md,
  },
  settingValue: {
    fontSize: Typography.fontSizes.sm,
  },
  divider: {
    height: 1,
    marginLeft: 50,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  logoutText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing['2xl'],
  },
});
