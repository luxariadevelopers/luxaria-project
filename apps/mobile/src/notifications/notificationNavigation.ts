import type { NavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '@/navigation/types';

export type NotificationRouteTarget =
  | {
      screen: 'GoodsReceipt';
      params?: AppStackParamList['GoodsReceipt'];
    }
  | { screen: 'DailyProgressReport' }
  | {
      screen: 'Tabs';
      params: NonNullable<AppStackParamList['Tabs']>;
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
    const entityId =
      typeof data.entityId === 'string' ? data.entityId.trim() : '';
    if (entityType.includes('purchase_order') && entityId) {
      return {
        screen: 'GoodsReceipt',
        params: { purchaseOrderId: entityId },
      };
    }
    return { screen: 'GoodsReceipt' };
  }

  if (
    entityType.includes('dpr') ||
    eventType.includes('missing_dpr') ||
    eventType.includes('daily_progress')
  ) {
    return { screen: 'DailyProgressReport' };
  }

  return { screen: 'Tabs', params: { screen: 'Home' } };
}

export function navigateFromNotificationData(
  navigation: NavigationContainerRef<AppStackParamList> | null,
  data: Record<string, unknown>,
) {
  if (!navigation?.isReady()) {
    return false;
  }

  const target = resolveNotificationRoute(data);
  if (target.screen === 'GoodsReceipt') {
    navigation.navigate('GoodsReceipt', target.params);
  } else if (target.screen === 'DailyProgressReport') {
    navigation.navigate('DailyProgressReport');
  } else {
    navigation.navigate('Tabs', target.params);
  }
  return true;
}
