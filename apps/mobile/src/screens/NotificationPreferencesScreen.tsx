import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications';
import { getErrorMessage } from '@/api/client';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { usePushNotifications } from '@/notifications/PushNotificationContext';
import {
  buildPushPreferencePatch,
  isPushEnabledForUser,
} from '@/notifications/preferences';
import { colors, hitSlopMin, spacing, typography } from '@/theme';

export function NotificationPreferencesScreen() {
  const queryClient = useQueryClient();
  const { syncPushRegistration } = usePushNotifications();
  const prefsQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: async () => {
      const res = await fetchNotificationPreferences();
      return res.data ?? null;
    },
  });

  const [muted, setMuted] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!prefsQuery.data) {
      return;
    }
    setMuted(prefsQuery.data.muted);
    setPushEnabled(isPushEnabledForUser(prefsQuery.data.events));
  }, [prefsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const events = buildPushPreferencePatch(
        pushEnabled,
        prefsQuery.data?.events ?? [],
      );
      return updateNotificationPreferences({ muted, events });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (pushEnabled) {
        const result = await syncPushRegistration();
        if (!result.registered) {
          Alert.alert('Push registration', result.message);
        }
      }
      Alert.alert('Saved', 'Notification preferences updated');
    },
    onError: (error) => {
      Alert.alert('Unable to save', getErrorMessage(error));
    },
  });

  if (prefsQuery.isLoading || prefsQuery.isError) {
    return (
      <Screen
        title="Notification preferences"
        subtitle="Control mute and mobile push delivery"
      >
        <AsyncStatePanel
          loading={prefsQuery.isLoading}
          error={
            prefsQuery.isError
              ? getErrorMessage(prefsQuery.error, 'Could not load preferences')
              : null
          }
          onRetry={() => {
            void prefsQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Notification preferences"
      subtitle="Control mute and mobile push delivery"
    >
      <FormSection
        title="Delivery"
        description="In-app inbox may still receive critical items when muted."
      >
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Mute all notifications</Text>
            <Text style={styles.help}>
              Suppresses non-critical alerts across channels.
            </Text>
          </View>
          <Switch
            value={muted}
            onValueChange={setMuted}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Push notifications</Text>
            <Text style={styles.help}>
              Registers this device when enabled and respects your server
              preferences.
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </FormSection>

      <Button
        label="Save preferences"
        loading={saveMutation.isPending}
        onPress={() => {
          void saveMutation.mutateAsync();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitSlopMin,
  },
  copy: {
    flex: 1,
  },
  label: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  help: {
    ...typography.meta,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
