import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { usePushNotifications } from '@/notifications/PushNotificationContext';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import {
  requestCameraPermission,
  requestLocationPermission,
} from '@/utils/permissions';
import { spacing, typography } from '@/theme';

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
    <Screen
      title="Profile"
      subtitle="Account, device access, and session"
      showHeader
    >
      <FormSection title="Account">
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.fullName ?? '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>User code</Text>
          <Text style={styles.value}>{user?.userCode ?? '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Mobile</Text>
          <Text style={styles.value}>{user?.mobile ?? '—'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Roles</Text>
          <Text style={styles.value}>
            {access?.roleCodes?.join(', ') || '—'}
          </Text>
        </View>
      </FormSection>

      {!user?.mustChangePassword ? (
        <FormSection title="Security" framed={false}>
          <ListRow
            title="Change password"
            meta="Update your account password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </FormSection>
      ) : null}

      <FormSection title="Notifications" framed={false}>
        <ListRow
          title={
            canViewNotifications
              ? 'Open notifications'
              : 'Notifications (needs notification.view)'
          }
          onPress={
            canViewNotifications
              ? () => navigation.navigate('Notifications')
              : undefined
          }
          disabled={!canViewNotifications}
        />
        <ListRow
          title="Notification preferences"
          onPress={() => navigation.navigate('NotificationPreferences')}
        />
        {lastForegroundTitle ? (
          <Text style={styles.hint}>
            Last foreground alert: {lastForegroundTitle}
          </Text>
        ) : null}
      </FormSection>

      <FormSection title="Device permissions" framed={false}>
        <ListRow
          title="Request camera permission"
          onPress={() => void runPermission('Camera', requestCameraPermission)}
        />
        <ListRow
          title="Request location permission"
          onPress={() =>
            void runPermission('Location', requestLocationPermission)
          }
        />
        <ListRow
          title="Sync push token with server"
          onPress={() => {
            void (async () => {
              const result = await syncPushRegistration();
              Alert.alert('Push notifications', result.message);
            })();
          }}
        />
      </FormSection>

      <Button
        label="Sign out"
        variant="danger"
        loading={busy}
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
        style={styles.logout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
  },
  hint: {
    ...typography.meta,
    marginTop: spacing.xs,
  },
  logout: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
});
