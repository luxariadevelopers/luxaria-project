import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import type { MainTabParamList } from '@/navigation/types';
import { registerForPushNotificationsAsync } from '@/notifications/pushNotifications';
import { useOfflineSync } from '@/offline';
import {
  requestCameraPermission,
  requestLocationPermission,
} from '@/utils/permissions';
import { colors } from '@/theme/colors';

export function ProfileScreen() {
  const { user, access, logout } = useAuth();
  const { activeCount } = useOfflineSync();
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, 'Profile'>>();
  const [busy, setBusy] = useState(false);

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

      <Text style={styles.section}>Offline sync</Text>
      <Pressable
        style={styles.action}
        onPress={() => navigation.navigate('PendingSync')}
      >
        <Text style={styles.actionText}>
          Pending Sync{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
      </Pressable>

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
            const result = await registerForPushNotificationsAsync();
            Alert.alert('Push notifications', result.message);
          })();
        }}
      >
        <Text style={styles.actionText}>Register push (placeholder)</Text>
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
