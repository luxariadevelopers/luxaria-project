import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications';
import { getErrorMessage } from '@/api/client';
import { usePushNotifications } from '@/notifications/PushNotificationContext';
import {
  buildPushPreferencePatch,
  isPushEnabledForUser,
} from '@/notifications/preferences';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

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

  if (prefsQuery.isLoading) {
    return (
      <Screen title="Notification preferences" subtitle="Loading…">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Notification preferences"
      subtitle="Control mute and mobile push delivery"
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Mute all notifications</Text>
            <Text style={styles.help}>
              In-app inbox may still receive critical items when muted.
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
      </View>

      <Pressable
        style={[styles.save, saveMutation.isPending && styles.disabled]}
        disabled={saveMutation.isPending}
        onPress={() => {
          void saveMutation.mutateAsync();
        }}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save preferences</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  help: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  save: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
});
