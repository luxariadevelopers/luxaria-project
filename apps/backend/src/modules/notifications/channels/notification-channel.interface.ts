import type { NotificationChannel } from '../notifications.constants';

export type ChannelDeliveryInput = {
  userId: string;
  eventType: string;
  subject: string;
  body: string;
  data: Record<string, unknown>;
  notificationId?: string | null;
};

export type ChannelDeliveryResult = {
  success: boolean;
  skipped?: boolean;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
};

export interface NotificationChannelHandler {
  readonly channel: NotificationChannel;
  deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult>;
}
