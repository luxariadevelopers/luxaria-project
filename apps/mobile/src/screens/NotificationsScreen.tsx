import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from '@/api/notifications';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import { NotificationCard } from '@/notifications/NotificationCard';
import { resolveNotificationDeepLink } from '@/notifications/resolveDeepLink';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

const QUERY_KEY = ['notifications', 'inbox'] as const;

export function NotificationsScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { projects, setSelectedProjectId, isLoading: projectsLoading } =
    useProject();
  const queryClient = useQueryClient();
  const canView = hasPermission('notification.view');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const accessibleProjectIds = useMemo(
    () => new Set(projects.map((p) => p.id)),
    [projects],
  );

  const deepLinkContext = useMemo(
    () => ({
      hasPermission,
      accessibleProjectIds,
    }),
    [accessibleProjectIds, hasPermission],
  );

  const inboxQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listNotifications({ page: 1, limit: 50 }),
    enabled: canView,
    retry: false,
  });

  const unreadQuery = useQuery({
    queryKey: [...QUERY_KEY, 'unread-count'],
    queryFn: fetchUnreadNotificationCount,
    enabled: canView,
    retry: false,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const previewActionable = useCallback(
    (item: InboxNotification) => {
      const result = resolveNotificationDeepLink(item, deepLinkContext);
      return (
        result.status === 'ok' ||
        result.status === 'forbidden' ||
        result.status === 'invalid'
      );
    },
    [deepLinkContext],
  );

  const openNotification = useCallback(
    async (item: InboxNotification) => {
      if (
        projectsLoading &&
        (item.projectId || item.entityType?.toLowerCase() === 'project')
      ) {
        Alert.alert('Please wait', 'Loading your project access…');
        return;
      }

      const resolved = resolveNotificationDeepLink(item, deepLinkContext);

      if (resolved.status === 'invalid') {
        Alert.alert('Invalid link', resolved.reason);
        return;
      }
      if (resolved.status === 'forbidden') {
        Alert.alert('Permission denied', resolved.reason);
        return;
      }
      if (resolved.status === 'none') {
        if (!item.isRead) {
          try {
            await markNotificationRead(item.id);
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          } catch (error) {
            Alert.alert(
              'Notification',
              getErrorMessage(error, 'Could not mark as read'),
            );
          }
        }
        Alert.alert('Notification', resolved.reason);
        return;
      }

      setOpeningId(item.id);
      try {
        if (!item.isRead) {
          await markNotificationRead(item.id);
          await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }

        if (resolved.projectId) {
          await setSelectedProjectId(resolved.projectId);
        }

        const { target } = resolved;
        switch (target.screen) {
          case 'GoodsReceipt':
            navigation.navigate('GoodsReceipt', target.params);
            break;
          case 'DailyProgressReport':
            navigation.navigate('DailyProgressReport');
            break;
          case 'DprList':
            navigation.navigate('DprList');
            break;
          case 'DprDetail':
            navigation.navigate('DprDetail', target.params);
            break;
          case 'ApprovalsList':
            navigation.navigate('ApprovalsList');
            break;
          case 'ApprovalDetail':
            navigation.navigate('ApprovalDetail', target.params);
            break;
          case 'LabourAttendanceDetail':
            navigation.navigate('LabourAttendanceDetail', target.params);
            break;
          case 'SiteExpenseDetail':
            navigation.navigate('SiteExpenseDetail', target.params);
            break;
          case 'PettyCashDetail':
            navigation.navigate('PettyCashDetail', target.params);
            break;
          case 'PurchaseRequestDetail':
            navigation.navigate('PurchaseRequestDetail', target.params);
            break;
          case 'ProjectSelect':
            navigation.navigate('ProjectSelect');
            break;
          case 'Tabs':
            navigation.navigate('Tabs', target.params);
            break;
          default: {
            const _exhaustive: never = target;
            void _exhaustive;
          }
        }
      } catch (error) {
        if (isForbiddenError(error)) {
          Alert.alert(
            'Permission denied',
            getErrorMessage(error, 'You cannot open this notification'),
          );
        } else {
          Alert.alert(
            'Notification',
            getErrorMessage(error, 'Could not open notification'),
          );
        }
      } finally {
        setOpeningId(null);
      }
    },
    [
      deepLinkContext,
      navigation,
      projectsLoading,
      queryClient,
      setSelectedProjectId,
    ],
  );

  if (!canView) {
    return (
      <Screen title="Notifications" subtitle="In-app alerts for your account">
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Permission denied</Text>
          <Text style={styles.stateBody}>
            You need notification.view to open the notifications inbox.
          </Text>
        </View>
      </Screen>
    );
  }

  const forbidden = isForbiddenError(inboxQuery.error);
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <Screen
      title="Notifications"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread`
          : 'In-app alerts for your account'
      }
      scroll={false}
      rightSlot={
        unreadCount > 0 ? (
          <Pressable
            style={styles.markAll}
            disabled={markAllMutation.isPending}
            onPress={() => {
              void markAllMutation.mutateAsync().catch((error: unknown) => {
                Alert.alert(
                  'Notifications',
                  getErrorMessage(error, 'Could not mark all read'),
                );
              });
            }}
          >
            <Text style={styles.markAllText}>
              {markAllMutation.isPending ? '…' : 'Mark all read'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {inboxQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : inboxQuery.isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>
            {forbidden ? 'Permission denied' : 'Could not load notifications'}
          </Text>
          <Text style={styles.stateBody}>
            {getErrorMessage(
              inboxQuery.error,
              forbidden
                ? 'You do not have access to notifications.'
                : 'Check your connection and try again.',
            )}
          </Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              void inboxQuery.refetch();
              void unreadQuery.refetch();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={inboxQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={inboxQuery.isFetching && !inboxQuery.isLoading}
          onRefresh={() => {
            void inboxQuery.refetch();
            void unreadQuery.refetch();
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No notifications yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={openingId === item.id ? styles.opening : undefined}>
              <NotificationCard
                notification={item}
                actionable={previewActionable(item)}
                onPress={() => {
                  void openNotification(item);
                }}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 28,
  },
  empty: {
    color: colors.textMuted,
    marginTop: 24,
    fontSize: 15,
  },
  stateBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
  },
  stateTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  stateBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryText: {
    color: '#F4F0E6',
    fontWeight: '700',
  },
  markAll: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  opening: {
    opacity: 0.7,
  },
});
