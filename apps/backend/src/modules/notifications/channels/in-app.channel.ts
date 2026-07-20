import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../notifications.constants';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';

/**
 * In-app channel — the Notification document is already persisted.
 * Delivery marks the channel as sent (UI reads from notifications collection).
 */
@Injectable()
export class InAppChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.InApp;

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    return {
      success: true,
      providerMessageId: input.notificationId ?? `in-app:${input.userId}`,
      meta: { mode: 'persisted' },
    };
  }
}
