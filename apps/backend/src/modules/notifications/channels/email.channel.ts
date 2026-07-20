import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../notifications.constants';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';

/**
 * Email channel — SMTP/provider integration placeholder.
 */
@Injectable()
export class EmailChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.Email;
  private readonly logger = new Logger(EmailChannel.name);

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    const messageId = `email-stub:${Date.now()}:${input.userId}`;
    this.logger.log(
      `Email (stub) → user=${input.userId} subject="${input.subject}"`,
    );
    return {
      success: true,
      providerMessageId: messageId,
      meta: {
        provider: 'stub',
        toUserId: input.userId,
        subject: input.subject,
        bodyPreview: input.body.slice(0, 120),
      },
    };
  }
}
