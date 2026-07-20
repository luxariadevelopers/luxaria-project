import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { usePushNotifications } from '@/notifications/PushNotificationContext';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import {
  requestCameraPermission,
  requestLocationPermission,
} from '@/utils/permissions';
import { colors } from '@/theme/colors';

type ProfileNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, access, logout, hasPermission } = useAuth();
  const { syncPushRegistration, lastForegroundTitle } = usePushNotifications();
  const [busy, setBusy] = useState(false);
  const canViewNotifications = hasPermission('notification.view');

  const runPermission = async (
    label: string,
    action: () => Promise<{ granted: boolean; status: string }>,
  ) => {
    const result = await action();
    Alert.alert(
      label,
      result.granted
        ? 'Permission granted'
        : `Permission ${result.status}. Enable it in system settings if needed.`,
    );
  };

  return (
    <Screen title="Profile" subtitle="Account, device access, and session">
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.fullName ?? '—'}</Text>
        <Text style={styles.label}>User code</Text>
        <Text style={styles.value}>{user?.userCode ?? '—'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
        <Text style={styles.label}>Mobile</Text>
        <Text style={styles.value}>{user?.mobile ?? '—'}</Text>
        <Text style={styles.label}>Roles</Text>
        <Text style={styles.value}>
          {access?.roleCodes?.join(', ') || '—'}
        </Text>
      </View>

      <Text style={styles.section}>Notifications</Text>
      <Pressable
        style={[styles.action, !canViewNotifications && styles.disabled]}
        disabled={!canViewNotifications}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Text style={styles.actionText}>
          {canViewNotifications
            ? 'Open notifications'
            : 'Notifications (needs notification.view)'}
        </Text>
      </Pressable>
      <Pressable
        style={styles.action}
        onPress={() => navigation.navigate('NotificationPreferences')}
      >
        <Text style={styles.actionText}>Notification preferences</Text>
      </Pressable>
      {lastForegroundTitle ? (
        <Text style={styles.hint}>
          Last foreground alert: {lastForegroundTitle}
        </Text>
      ) : null}

      <Text style={styles.section}>Device permissions</Text>
      <Pressable
        style={styles.action}
        onPress={() =>
          void runPermission('Camera', requestCameraPermission)
        }
      >
        <Text style={styles.actionText}>Request camera permission</Text>
      </Pressable>
      <Pressable
        style={styles.action}
        onPress={() =>
          void runPermission('Location', requestLocationPermission)
        }
      >
        <Text style={styles.actionText}>Request location permission</Text>
      </Pressable>
      <Pressable
        style={styles.action}
        onPress={() => {
          void (async () => {
            const result = await syncPushRegistration();
            Alert.alert('Push notifications', result.message);
          })();
        }}
      >
        <Text style={styles.actionText}>Sync push token with server</Text>
      </Pressable>

      <Pressable
        style={[styles.logout, busy && styles.disabled]}
        disabled={busy}
        onPress={() => {
          void (async () => {
            setBusy(true);
            try {
              await logout();
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.logoutText}>Sign out</Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 10,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  action: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  actionText: {
    color: colors.primary,
    fontWeight: '600',
  },
  logout: {
    marginTop: 24,
    backgroundColor: colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
});
