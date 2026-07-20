import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../notifications.constants';
import { PushAdapter } from '../push.adapter';
import { PushTokenService } from '../push-token.service';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';

@Injectable()
export class PushChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.Push;
  private readonly logger = new Logger(PushChannel.name);

  constructor(
    private readonly pushTokenService: PushTokenService,
    private readonly pushAdapter: PushAdapter,
  ) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    if (!this.pushAdapter.isEnabled()) {
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

    const rows = await this.pushTokenService.findActiveTokensForUser(
      input.userId,
    );
    if (!rows.length) {
      return {
        success: false,
        skipped: true,
        errorMessage: 'No push tokens registered',
      };
    }

    const tokens = rows.map((row) => row.token);
    const result = await this.pushAdapter.send({
      tokens,
      title: input.subject,
      body: input.body,
      data: {
        ...(input.data ?? {}),
        eventType: input.eventType,
        notificationId: input.notificationId ?? null,
      },
    });

    if (result.invalidTokens.length) {
      const removed = await this.pushTokenService.invalidateTokens(
        result.invalidTokens,
      );
      this.logger.log(
        `Invalidated ${removed} push token(s) for user=${input.userId}`,
      );
    }

    if (result.sent > 0) {
      return {
        success: true,
        providerMessageId: result.ticketIds[0] ?? null,
        meta: {
          provider: 'expo',
          sent: result.sent,
          tokenCount: tokens.length,
          title: input.subject,
        },
      };
    }

    return {
      success: false,
      errorMessage:
        result.errors[0] ?? 'Push delivery failed for all device tokens',
      meta: {
        provider: 'expo',
        invalidTokenCount: result.invalidTokens.length,
      },
    };
  }
}
