import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../notifications.constants';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';

/**
 * WhatsApp channel placeholder — not wired to a provider yet.
 * Records a skipped delivery so templates/preferences can still be configured.
 */
@Injectable()
export class WhatsAppChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.WhatsApp;
  private readonly logger = new Logger(WhatsAppChannel.name);

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    this.logger.debug(
      `WhatsApp placeholder skipped for user=${input.userId} event=${input.eventType}`,
    );
    return {
      success: true,
      skipped: true,
      providerMessageId: null,
      meta: {
        provider: 'whatsapp_placeholder',
        reason: 'WhatsApp provider not configured',
      },
    };
  }
}
