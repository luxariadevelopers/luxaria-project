import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { NotificationChannelHandler } from './channels/notification-channel.interface';
import { EmailChannel } from './channels/email.channel';
import { InAppChannel } from './channels/in-app.channel';
import { PushChannel } from './channels/push.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import {
  DEFAULT_CHANNEL_SET,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
} from './notifications.constants';
import { renderTemplate } from './notifications.template';
import { NotificationDeliveryLog } from './schemas/notification-delivery-log.schema';
import { NotificationPreference } from './schemas/notification-preference.schema';
import { NotificationTemplate } from './schemas/notification-template.schema';
import { Notification } from './schemas/notification.schema';

export type DeliverJobData = {
  notificationId: string;
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  data: Record<string, unknown>;
  attempt?: number;
};

@Injectable()
export class NotificationsDispatcher {
  private readonly logger = new Logger(NotificationsDispatcher.name);
  private readonly handlers: Map<NotificationChannel, NotificationChannelHandler>;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(NotificationTemplate.name)
    private readonly templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreference>,
    @InjectModel(NotificationDeliveryLog.name)
    private readonly deliveryLogModel: Model<NotificationDeliveryLog>,
    inApp: InAppChannel,
    push: PushChannel,
    email: EmailChannel,
    whatsapp: WhatsAppChannel,
  ) {
    this.handlers = new Map<NotificationChannel, NotificationChannelHandler>([
      [NotificationChannel.InApp, inApp],
      [NotificationChannel.Push, push],
      [NotificationChannel.Email, email],
      [NotificationChannel.WhatsApp, whatsapp],
    ]);
  }

  async resolveChannelsForUser(
    userId: string,
    eventType: NotificationEventType,
    requested?: NotificationChannel[],
  ): Promise<NotificationChannel[]> {
    const candidates = requested?.length ? requested : DEFAULT_CHANNEL_SET;
    const prefs = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (prefs?.muted) {
      // Still allow in-app when muted so critical items remain visible in inbox.
      return candidates.includes(NotificationChannel.InApp)
        ? [NotificationChannel.InApp]
        : [];
    }

    const eventPref = prefs?.events?.find((e) => e.eventType === eventType);
    if (eventPref && eventPref.enabled === false) {
      return [];
    }

    return candidates.filter((channel) => {
      const channelPref = eventPref?.channels?.find((c) => c.channel === channel);
      if (channelPref) {
        return channelPref.enabled !== false;
      }
      // Default: WhatsApp off unless explicitly enabled
      if (channel === NotificationChannel.WhatsApp) {
        return false;
      }
      return true;
    });
  }

  async deliver(job: DeliverJobData): Promise<{
    status: NotificationDeliveryStatus;
    providerMessageId?: string | null;
  }> {
    const attempt = job.attempt ?? 1;
    const handler = this.handlers.get(job.channel);
    if (!handler) {
      await this.writeLog(job, attempt, {
        status: NotificationDeliveryStatus.Failed,
        errorMessage: `No handler for channel ${job.channel}`,
      });
      throw new Error(`No handler for channel ${job.channel}`);
    }

    const allowed = await this.resolveChannelsForUser(
      job.userId,
      job.eventType,
      [job.channel],
    );
    if (!allowed.includes(job.channel)) {
      await this.writeLog(job, attempt, {
        status: NotificationDeliveryStatus.Skipped,
        errorMessage: 'Channel disabled by user preference',
      });
      return { status: NotificationDeliveryStatus.Skipped };
    }

    const template = await this.templateModel
      .findOne({
        eventType: job.eventType,
        channel: job.channel,
        isActive: true,
      })
      .lean()
      .exec();

    const subject = template
      ? renderTemplate(template.subject, job.data)
      : this.fallbackSubject(job.eventType);
    const body = template
      ? renderTemplate(template.body, job.data)
      : this.fallbackBody(job.eventType, job.data);

    // Keep in-app notification text in sync with rendered template
    if (
      job.channel === NotificationChannel.InApp &&
      Types.ObjectId.isValid(job.notificationId)
    ) {
      await this.notificationModel
        .findByIdAndUpdate(job.notificationId, {
          title: subject,
          body,
        })
        .exec();
    }

    try {
      const result = await handler.deliver({
        userId: job.userId,
        eventType: job.eventType,
        subject,
        body,
        data: job.data,
        notificationId: job.notificationId,
      });

      if (result.skipped) {
        await this.writeLog(job, attempt, {
          status: NotificationDeliveryStatus.Skipped,
          providerMessageId: result.providerMessageId,
          errorMessage: result.errorMessage,
          meta: result.meta,
        });
        return { status: NotificationDeliveryStatus.Skipped };
      }

      if (!result.success) {
        await this.writeLog(job, attempt, {
          status: NotificationDeliveryStatus.Retrying,
          errorMessage: result.errorMessage ?? 'Channel returned failure',
          meta: result.meta,
        });
        throw new Error(result.errorMessage ?? 'Channel delivery failed');
      }

      await this.writeLog(job, attempt, {
        status: NotificationDeliveryStatus.Sent,
        providerMessageId: result.providerMessageId,
        meta: result.meta,
        sentAt: new Date(),
      });
      return {
        status: NotificationDeliveryStatus.Sent,
        providerMessageId: result.providerMessageId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown delivery error';
      this.logger.warn(
        `Delivery failed channel=${job.channel} user=${job.userId} attempt=${attempt}: ${message}`,
      );
      await this.writeLog(job, attempt, {
        status: NotificationDeliveryStatus.Failed,
        errorMessage: message,
      });
      throw error;
    }
  }

  private async writeLog(
    job: DeliverJobData,
    attempt: number,
    input: {
      status: NotificationDeliveryStatus;
      providerMessageId?: string | null;
      errorMessage?: string | null;
      meta?: Record<string, unknown>;
      sentAt?: Date;
    },
  ) {
    await this.deliveryLogModel.create({
      notificationId: Types.ObjectId.isValid(job.notificationId)
        ? new Types.ObjectId(job.notificationId)
        : null,
      userId: new Types.ObjectId(job.userId),
      eventType: job.eventType,
      channel: job.channel,
      status: input.status,
      attempt,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      jobId: null,
      sentAt: input.sentAt ?? null,
      meta: input.meta ?? {},
    });
  }

  private fallbackSubject(eventType: NotificationEventType): string {
    return eventType
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  private fallbackBody(
    eventType: NotificationEventType,
    data: Record<string, unknown>,
  ): string {
    const project = data.projectName ? ` for ${String(data.projectName)}` : '';
    return `${this.fallbackSubject(eventType)}${project}.`;
  }
}
