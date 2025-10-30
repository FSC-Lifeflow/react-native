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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
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
                      color="#666"
                      style={styles.settingIcon}
                    />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.settingRight}>
                    {item.isSwitch ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#ddd', true: '#007AFF80' }}
                        thumbColor={item.value ? '#007AFF' : '#f4f3f4'}
                      />
                    ) : item.value && typeof item.value === 'string' ? (
                      <Text style={styles.settingValue}>{item.value}</Text>
                    ) : item.showChevron ? (
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    ) : null}
                  </View>
                </TouchableOpacity>
                {itemIndex < section.items.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Made with ❤️ by the LifeFlow Team
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 50,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
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
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
});
