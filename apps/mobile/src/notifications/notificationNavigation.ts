import type { NavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '@/navigation/types';

export type NotificationRouteTarget = {
  screen: keyof AppStackParamList;
  params?: AppStackParamList[keyof AppStackParamList];
};

export function resolveNotificationRoute(
  data: Record<string, unknown>,
): NotificationRouteTarget {
  const entityType =
    typeof data.entityType === 'string' ? data.entityType.toLowerCase() : '';
  const eventType =
    typeof data.eventType === 'string' ? data.eventType.toLowerCase() : '';

  if (
    entityType.includes('goods_receipt') ||
    entityType.includes('purchase_order') ||
    eventType.includes('grn')
  ) {
    return { screen: 'GoodsReceipt' };
  }

  if (
    entityType.includes('dpr') ||
    eventType.includes('missing_dpr') ||
    eventType.includes('daily_progress')
  ) {
    return { screen: 'DailyProgressReport' };
  }

  return { screen: 'Tabs' };
}

export function navigateFromNotificationData(
  navigation: NavigationContainerRef<AppStackParamList> | null,
  data: Record<string, unknown>,
) {
  if (!navigation?.isReady()) {
    return false;
  }

  const target = resolveNotificationRoute(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigation as any).navigate(target.screen, target.params);
  return true;
}
