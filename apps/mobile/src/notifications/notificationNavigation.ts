import type { NavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '@/navigation/types';

export type NotificationRouteTarget =
  | {
      screen: 'GoodsReceipt';
      params?: AppStackParamList['GoodsReceipt'];
    }
  | { screen: 'DailyProgressReport' }
  | { screen: 'DprList' }
  | { screen: 'DprDetail'; params: { dprId: string } }
  | { screen: 'ApprovalsList' }
  | { screen: 'ApprovalDetail'; params: { approvalId: string } }
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
  const entityId =
    typeof data.entityId === 'string' ? data.entityId.trim() : '';

  if (
    entityType.includes('goods_receipt') ||
    entityType.includes('purchase_order') ||
    eventType.includes('grn')
  ) {
    if (entityType.includes('purchase_order') && entityId) {
      return {
        screen: 'GoodsReceipt',
        params: { purchaseOrderId: entityId },
      };
    }
    return { screen: 'GoodsReceipt' };
  }

  if (entityType.includes('approval_request')) {
    if (entityId) {
      return {
        screen: 'ApprovalDetail',
        params: { approvalId: entityId },
      };
    }
    return { screen: 'ApprovalsList' };
  }

  if (
    entityType.includes('daily_progress_report') ||
    entityType.includes('dpr') ||
    eventType.includes('missing_dpr') ||
    eventType.includes('daily_progress')
  ) {
    if (entityId && entityType.includes('daily_progress_report')) {
      return { screen: 'DprDetail', params: { dprId: entityId } };
    }
    if (eventType.includes('missing_dpr')) {
      return { screen: 'DailyProgressReport' };
    }
    return { screen: 'DprList' };
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
    case 'Tabs':
      navigation.navigate('Tabs', target.params);
      break;
    default: {
      const _exhaustive: never = target;
      void _exhaustive;
    }
  }
  return true;
}
