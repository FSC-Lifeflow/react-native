import { Card } from '@/components/ui/Card';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useFitbit } from '@/hooks/useFitbit';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useThemeControl } from '@/hooks/useThemeControl';
import { googleCalendarService } from '@/services/googleCalendarService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { theme, setTheme } = useThemeControl();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const { isConnected: fitbitConnected, isLoading: fitbitLoading, connect: connectFitbit, disconnect: disconnectFitbit } = useFitbit();
  const { isAuthenticated: calendarConnected, signOut: disconnectCalendar } = useGoogleCalendar();
  const [notifications, setNotifications] = useState(true);
  const [activitySharing, setActivitySharing] = useState(
    user?.activity_sharing ?? true
  );
  const [socialPrivacy, setSocialPrivacy] = useState(
    user?.social_privacy ?? false
  );

  const handleFitbitPress = async () => {
    console.log('🔵 Fitbit button pressed, Platform:', Platform.OS);
    console.log('🔵 Fitbit connected:', fitbitConnected);
    console.log('🔵 Fitbit loading:', fitbitLoading);
    
    // Fitbit OAuth doesn't work on web due to CORS restrictions
    // It requires a backend proxy server
    if (Platform.OS === 'web') {
      window.alert(
        'Fitbit integration is only available on mobile apps.\n\n' +
        'Due to browser security restrictions (CORS), Fitbit OAuth requires a backend server. ' +
        'Please use the iOS or Android app to connect your Fitbit device.'
      );
      return;
    }

    if (fitbitLoading) {
      console.log('⚠️ Fitbit operation already in progress');
      return;
    }

    try {
      if (fitbitConnected) {
        // Disconnect
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert('Disconnect Fitbit', 'Are you sure you want to disconnect from Fitbit?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Disconnect', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
        
        if (confirmed) {
          console.log('🔴 Disconnecting from Fitbit...');
          const success = await disconnectFitbit();
          if (success) {
            Alert.alert('Success', 'Disconnected from Fitbit');
          } else {
            Alert.alert('Error', 'Failed to disconnect from Fitbit');
          }
        }
      } else {
        // Connect
        console.log('🟢 Connecting to Fitbit...');
        const success = await connectFitbit();
        console.log('🟢 Connect result:', success);
        
        if (success) {
          Alert.alert('Success', 'Connected to Fitbit!');
        } else {
          Alert.alert('Error', 'Failed to connect to Fitbit. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Fitbit connection error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to connect to Fitbit');
    }
  };

  const handleGoogleCalendarPress = async () => {
    if (!user?.id) return;

    if (calendarConnected) {
      // Disconnect
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert('Disconnect Google Calendar', 'Are you sure you want to disconnect from Google Calendar?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Disconnect', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      
      if (confirmed) {
        try {
          await disconnectCalendar();
          Alert.alert('Success', 'Disconnected from Google Calendar');
        } catch (error) {
          Alert.alert('Error', 'Failed to disconnect from Google Calendar');
        }
      }
    } else {
      // Connect
      try {
        console.log('🔵 Getting Google OAuth URL...');
        const authUrl = await googleCalendarService.getAuthUrl(user.id);
        console.log('🔵 Opening OAuth browser:', authUrl);
        
        // Open OAuth in browser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, 'lifeflow://');
        
        if (result.type === 'success') {
          Alert.alert('Success', 'Google Calendar connected! Your events will now sync automatically.');
        } else if (result.type === 'cancel') {
          console.log('⚠️ OAuth cancelled by user');
        }
      } catch (error) {
        console.error('❌ Google Calendar connection error:', error);
        Alert.alert('Error', 'Failed to connect to Google Calendar. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    // On web, use window.confirm instead of Alert.alert
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to logout?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Logout', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (!confirmed) return;

    try {
      await logout();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to logout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    }
  };

  const settingsSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Appearance',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: theme === 'dark',
          onToggle: (value: boolean) => setTheme(value ? 'dark' : 'light'),
          isSwitch: true,
        },
      ],
    },
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
          subtitle: fitbitConnected ? 'Connected' : 'Not connected',
          onPress: handleFitbitPress,
          showChevron: true,
        },
        {
          icon: 'calendar-outline',
          label: 'Google Calendar',
          subtitle: calendarConnected ? 'Connected' : 'Not connected',
          onPress: handleGoogleCalendarPress,
          showChevron: true,
        },
      ],
    },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
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
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={item.value ? '#ffffff' : '#8e8e93'}
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
