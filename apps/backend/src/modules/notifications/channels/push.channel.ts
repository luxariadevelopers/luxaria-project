import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../notifications.constants';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';

/**
 * Push notification channel — provider integration placeholder.
 * Logs intent and returns success so delivery pipeline can be tested end-to-end.
 */
@Injectable()
export class PushChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.Push;
  private readonly logger = new Logger(PushChannel.name);

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    const messageId = `push-stub:${Date.now()}:${input.userId}`;
    this.logger.log(
      `Push (stub) → user=${input.userId} event=${input.eventType} subject="${input.subject}"`,
    );
    return {
      success: true,
      providerMessageId: messageId,
      meta: { provider: 'stub', title: input.subject },
    };
  }
}
