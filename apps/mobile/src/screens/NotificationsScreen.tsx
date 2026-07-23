import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { Button } from '@/components/Button';
import { ListScreen } from '@/components/ListScreen';
import { useProject } from '@/context/ProjectContext';
import { NotificationCard } from '@/notifications/NotificationCard';
import { resolveNotificationDeepLink } from '@/notifications/resolveDeepLink';
import type { AppStackParamList } from '@/navigation/types';

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
          case 'WorkMeasurementList':
            navigation.navigate('WorkMeasurementList');
            break;
          case 'WorkMeasurementForm':
            navigation.navigate('WorkMeasurementForm');
            break;
          case 'StockCountList':
            navigation.navigate('StockCountList');
            break;
          case 'StockCountEntry':
            navigation.navigate('StockCountEntry', target.params);
            break;
          case 'MaterialIssue':
            navigation.navigate('MaterialIssue');
            break;
          case 'MaterialIssueForm':
            navigation.navigate('MaterialIssueForm');
            break;
          case 'MaterialReturn':
            navigation.navigate('MaterialReturn', target.params);
            break;
          case 'LabourVoucherHistory':
            navigation.navigate('LabourVoucherHistory');
            break;
          case 'LabourVoucherDetail':
            navigation.navigate('LabourVoucherDetail', target.params);
            break;
          case 'QualityInspectionList':
            navigation.navigate('QualityInspectionList');
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

  const forbidden = !canView || isForbiddenError(inboxQuery.error);
  const unreadCount = unreadQuery.data ?? 0;
  const items = canView ? (inboxQuery.data?.items ?? []) : [];
  const error = !canView
    ? 'You need notification.view to open the notifications inbox.'
    : inboxQuery.isError
      ? getErrorMessage(
          inboxQuery.error,
          forbidden
            ? 'You do not have access to notifications.'
            : 'Check your connection and try again.',
        )
      : null;

  return (
    <ListScreen
      title="Notifications"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread`
          : 'In-app alerts for your account'
      }
      rightSlot={
        canView && unreadCount > 0 ? (
          <Button
            label="Mark all read"
            variant="ghost"
            loading={markAllMutation.isPending}
            onPress={() => {
              void markAllMutation.mutateAsync().catch((err: unknown) => {
                Alert.alert(
                  'Notifications',
                  getErrorMessage(err, 'Could not mark all read'),
                );
              });
            }}
            style={styles.markAll}
          />
        ) : null
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={canView && inboxQuery.isLoading}
      refreshing={inboxQuery.isFetching && !inboxQuery.isLoading}
      onRefresh={() => {
        void inboxQuery.refetch();
        void unreadQuery.refetch();
      }}
      error={error}
      forbidden={forbidden}
      emptyLabel="No notifications yet."
      onRetry={() => {
        void inboxQuery.refetch();
        void unreadQuery.refetch();
      }}
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
  );
}

const styles = StyleSheet.create({
  markAll: {
    minWidth: 120,
    paddingVertical: 8,
  },
  opening: {
    opacity: 0.7,
  },
});
