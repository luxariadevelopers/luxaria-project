import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo, {
  type ExpoPushMessage,
  type ExpoPushReceipt,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import type { AppConfig } from '../../config/configuration';

export type PushSendInput = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PushSendResult = {
  sent: number;
  ticketIds: string[];
  invalidTokens: string[];
  errors: string[];
};

@Injectable()
export class PushAdapter {
  private readonly logger = new Logger(PushAdapter.name);
  private readonly expo: Expo | null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const enabled = this.configService.get('pushEnabled', { infer: true });
    const accessToken = this.configService.get('expoAccessToken', { infer: true });
    this.expo = enabled
      ? new Expo(accessToken ? { accessToken } : undefined)
      : null;
  }

  isEnabled(): boolean {
    return this.expo !== null;
  }

  async send(input: PushSendInput): Promise<PushSendResult> {
    if (!this.expo) {
      return {
        sent: 0,
        ticketIds: [],
        invalidTokens: [],
        errors: ['Push adapter disabled'],
      };
    }

    const messages: ExpoPushMessage[] = [];
    const invalidTokens: string[] = [];

    for (const token of input.tokens) {
      if (!Expo.isExpoPushToken(token)) {
        invalidTokens.push(token);
        continue;
      }
      messages.push({
        to: token,
        sound: 'default',
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      });
    }

    if (!messages.length) {
      return {
        sent: 0,
        ticketIds: [],
        invalidTokens,
        errors: invalidTokens.length ? ['All tokens invalid'] : ['No tokens'],
      };
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const ticketIds: string[] = [];
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] =
          await this.expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < tickets.length; i += 1) {
          const ticket = tickets[i];
          const token = chunk[i]?.to;
          if (ticket.status === 'ok') {
            ticketIds.push(ticket.id);
            continue;
          }
          const detail = ticket.details?.error ?? ticket.message ?? 'Push failed';
          errors.push(String(detail));
          if (
            token &&
            typeof token === 'string' &&
            (detail === 'DeviceNotRegistered' ||
              detail === 'InvalidCredentials' ||
              !Expo.isExpoPushToken(token))
          ) {
            invalidTokens.push(token);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Expo push send failed';
        this.logger.warn(message);
        errors.push(message);
      }
    }

    if (ticketIds.length) {
      await this.collectInvalidFromReceipts(ticketIds, invalidTokens);
    }

    return {
      sent: ticketIds.length,
      ticketIds,
      invalidTokens: [...new Set(invalidTokens)],
      errors,
    };
  }

  private async collectInvalidFromReceipts(
    ticketIds: string[],
    invalidTokens: string[],
  ) {
    if (!this.expo || !ticketIds.length) {
      return;
    }

    try {
      const receiptIds = ticketIds.filter((id) => id.startsWith('ticket-') || id.length > 0);
      if (!receiptIds.length) {
        return;
      }
      const receipts = await this.expo.getPushNotificationReceiptsAsync(
        receiptIds,
      );
      for (const receipt of Object.values(receipts) as ExpoPushReceipt[]) {
        if (receipt.status === 'error') {
          const detail = receipt.details?.error ?? receipt.message;
          if (detail === 'DeviceNotRegistered') {
            const token = receipt.details?.expoPushToken;
            if (typeof token === 'string') {
              invalidTokens.push(token);
            }
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Receipt fetch failed';
      this.logger.debug(message);
    }
  }
}
