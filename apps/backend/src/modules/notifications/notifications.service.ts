import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import type { Queue } from 'bullmq';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type { AppConfig } from '../../config/configuration';
import type {
  ListDeliveryLogsQueryDto,
  ListNotificationsQueryDto,
  ScheduleNotificationDto,
  SendNotificationDto,
  UpdatePreferencesDto,
  UpsertTemplateDto,
} from './dto/notification.dto';
import {
  DEFAULT_CHANNEL_SET,
  NOTIFICATION_JOB_DELIVER,
  NOTIFICATIONS_QUEUE,
  NotificationChannel,
  NotificationEventType,
  ScheduledNotificationStatus,
} from './notifications.constants';
import type { DeliverJobData } from './notifications.dispatcher';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationDeliveryLog } from './schemas/notification-delivery-log.schema';
import { NotificationPreference } from './schemas/notification-preference.schema';
import { NotificationTemplate } from './schemas/notification-template.schema';
import { Notification } from './schemas/notification.schema';
import { ScheduledNotification } from './schemas/scheduled-notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(NotificationTemplate.name)
    private readonly templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreference>,
    @InjectModel(NotificationDeliveryLog.name)
    private readonly deliveryLogModel: Model<NotificationDeliveryLog>,
    @InjectModel(ScheduledNotification.name)
    private readonly scheduledModel: Model<ScheduledNotification>,
    private readonly dispatcher: NotificationsDispatcher,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ─── send / schedule ───────────────────────────────────────────────────

  async send(dto: SendNotificationDto, actorId?: string) {
    void actorId;
    const data = dto.data ?? {};
    const results: Array<{
      userId: string;
      notificationId: string;
      channels: NotificationChannel[];
      mode: 'queued' | 'inline';
    }> = [];

    for (const userId of dto.userIds) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException(`Invalid userId: ${userId}`);
      }

      const channels = await this.dispatcher.resolveChannelsForUser(
        userId,
        dto.eventType,
        dto.channels?.length ? dto.channels : DEFAULT_CHANNEL_SET,
      );

      if (!channels.length) {
        continue;
      }

      const title = String(data.title ?? this.humanize(dto.eventType));
      const body = String(
        data.body ?? `${title}${data.projectName ? ` — ${data.projectName}` : ''}`,
      );

      let notification;
      try {
        notification = await this.notificationModel.create({
          userId: new Types.ObjectId(userId),
          eventType: dto.eventType,
          title,
          body,
          data,
          channels,
          isRead: false,
          readAt: null,
          projectId: dto.projectId
            ? new Types.ObjectId(dto.projectId)
            : null,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          idempotencyKey: dto.idempotencyKey
            ? `${dto.idempotencyKey}:${userId}`
            : null,
        });
      } catch (error) {
        if (this.isDuplicateKey(error) && dto.idempotencyKey) {
          const existing = await this.notificationModel
            .findOne({
              idempotencyKey: `${dto.idempotencyKey}:${userId}`,
            })
            .lean()
            .exec();
          if (existing) {
            results.push({
              userId,
              notificationId: String(existing._id),
              channels: existing.channels,
              mode: 'inline',
            });
            continue;
          }
        }
        throw error;
      }

      const mode = await this.enqueueDeliveries({
        notificationId: String(notification._id),
        userId,
        eventType: dto.eventType,
        channels,
        data,
      });

      results.push({
        userId,
        notificationId: String(notification._id),
        channels,
        mode,
      });
    }

    return createSuccessResponse(results, 'Notifications dispatched');
  }

  async schedule(dto: ScheduleNotificationDto, actorId?: string) {
    const when = new Date(dto.scheduledFor);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException('Invalid scheduledFor');
    }
    if (when.getTime() <= Date.now()) {
      // Due now — send immediately
      return this.send(dto, actorId);
    }

    const created = await this.scheduledModel.create({
      userIds: dto.userIds.map((id) => new Types.ObjectId(id)),
      eventType: dto.eventType,
      data: dto.data ?? {},
      channels: dto.channels ?? [],
      scheduledFor: when,
      status: ScheduledNotificationStatus.Pending,
      projectId: dto.projectId
        ? new Types.ObjectId(dto.projectId)
        : null,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });

    return createSuccessResponse(
      {
        id: String(created._id),
        scheduledFor: created.scheduledFor.toISOString(),
        status: created.status,
        userCount: created.userIds.length,
      },
      'Notification scheduled',
    );
  }

  async processDueScheduled(limit = 100) {
    const due = await this.scheduledModel
      .find({
        status: ScheduledNotificationStatus.Pending,
        scheduledFor: { $lte: new Date() },
      })
      .sort({ scheduledFor: 1 })
      .limit(limit)
      .exec();

    const processed: string[] = [];
    for (const row of due) {
      try {
        await this.send({
          eventType: row.eventType,
          userIds: row.userIds.map((id) => String(id)),
          data: row.data ?? {},
          channels: row.channels?.length ? row.channels : undefined,
          projectId: row.projectId ? String(row.projectId) : undefined,
          entityType: row.entityType ?? undefined,
          entityId: row.entityId ?? undefined,
          idempotencyKey: row.idempotencyKey ?? undefined,
        });
        row.status = ScheduledNotificationStatus.Queued;
        row.queuedAt = new Date();
        row.lastError = null;
        await row.save();
        processed.push(String(row._id));
      } catch (error) {
        row.status = ScheduledNotificationStatus.Failed;
        row.lastError =
          error instanceof Error ? error.message : 'Schedule processing failed';
        await row.save();
      }
    }

    return { processedCount: processed.length, ids: processed };
  }

  // ─── inbox ─────────────────────────────────────────────────────────────

  async listInbox(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Notification> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.unreadOnly) {
      filter.isRead = false;
    }
    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    const [rows, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => this.toPublicNotification(r)),
      'Notifications',
      buildPaginationMeta(page, limit, total),
    );
  }

  async markRead(notificationId: string, userId: string) {
    const row = await this.notificationModel.findById(notificationId).exec();
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (String(row.userId) !== userId) {
      throw new NotFoundException('Notification not found');
    }
    if (!row.isRead) {
      row.isRead = true;
      row.readAt = new Date();
      await row.save();
    }
    return createSuccessResponse(
      this.toPublicNotification(row.toObject()),
      'Notification marked read',
    );
  }

  async markAllRead(userId: string) {
    const result = await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      )
      .exec();
    return createSuccessResponse(
      { modifiedCount: result.modifiedCount },
      'All notifications marked read',
    );
  }

  // ─── preferences ───────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const prefs = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    return createSuccessResponse(
      {
        userId,
        muted: prefs?.muted ?? false,
        events: prefs?.events ?? [],
      },
      'Notification preferences',
    );
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const updated = await this.preferenceModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...(dto.muted !== undefined ? { muted: dto.muted } : {}),
            ...(dto.events !== undefined ? { events: dto.events } : {}),
          },
          $setOnInsert: { userId: new Types.ObjectId(userId) },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return createSuccessResponse(
      {
        userId,
        muted: updated?.muted ?? false,
        events: updated?.events ?? [],
      },
      'Notification preferences updated',
    );
  }

  // ─── templates ─────────────────────────────────────────────────────────

  async listTemplates() {
    const rows = await this.templateModel
      .find({})
      .sort({ eventType: 1, channel: 1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => ({
        id: String(r._id),
        eventType: r.eventType,
        channel: r.channel,
        subject: r.subject,
        body: r.body,
        variables: r.variables,
        isActive: r.isActive,
        description: r.description,
      })),
      'Notification templates',
    );
  }

  async upsertTemplate(dto: UpsertTemplateDto) {
    const updated = await this.templateModel
      .findOneAndUpdate(
        { eventType: dto.eventType, channel: dto.channel },
        {
          $set: {
            subject: dto.subject.trim(),
            body: dto.body.trim(),
            variables: dto.variables ?? [],
            isActive: dto.isActive ?? true,
            description: dto.description?.trim() ?? null,
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return createSuccessResponse(
      {
        id: String(updated?._id),
        eventType: updated?.eventType,
        channel: updated?.channel,
        subject: updated?.subject,
        body: updated?.body,
        isActive: updated?.isActive,
      },
      'Notification template saved',
    );
  }

  // ─── delivery logs / retry ─────────────────────────────────────────────

  async listDeliveryLogs(query: ListDeliveryLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<NotificationDeliveryLog> = {};
    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    const [rows, total] = await Promise.all([
      this.deliveryLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.deliveryLogModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => ({
        id: String(r._id),
        notificationId: r.notificationId ? String(r.notificationId) : null,
        userId: String(r.userId),
        eventType: r.eventType,
        channel: r.channel,
        status: r.status,
        attempt: r.attempt,
        providerMessageId: r.providerMessageId,
        errorMessage: r.errorMessage,
        jobId: r.jobId,
        sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
        createdAt: r.createdAt
          ? new Date(r.createdAt).toISOString()
          : null,
      })),
      'Delivery logs',
      buildPaginationMeta(page, limit, total),
    );
  }

  async retryDelivery(logId: string, force = false) {
    const log = await this.deliveryLogModel.findById(logId).lean().exec();
    if (!log) {
      throw new NotFoundException('Delivery log not found');
    }
    if (
      log.status === 'sent' &&
      !force
    ) {
      throw new BadRequestException(
        'Delivery already sent; pass force=true to retry',
      );
    }

    const notificationId = log.notificationId
      ? String(log.notificationId)
      : `retry:${logId}`;
    const notification = log.notificationId
      ? await this.notificationModel.findById(log.notificationId).lean().exec()
      : null;

    const job: DeliverJobData = {
      notificationId,
      userId: String(log.userId),
      eventType: log.eventType as NotificationEventType,
      channel: log.channel as NotificationChannel,
      data: (notification?.data as Record<string, unknown>) ?? {},
      attempt: (log.attempt ?? 0) + 1,
    };

    const mode = await this.enqueueOne(job);
    return createSuccessResponse(
      { logId, mode, channel: log.channel },
      'Delivery retry enqueued',
    );
  }

  async listScheduled(status?: ScheduledNotificationStatus) {
    const filter: FilterQuery<ScheduledNotification> = {};
    if (status) {
      filter.status = status;
    }
    const rows = await this.scheduledModel
      .find(filter)
      .sort({ scheduledFor: 1 })
      .limit(100)
      .lean()
      .exec();

    return createSuccessResponse(
      rows.map((r) => ({
        id: String(r._id),
        eventType: r.eventType,
        userCount: r.userIds.length,
        scheduledFor: r.scheduledFor.toISOString(),
        status: r.status,
        channels: r.channels,
      })),
      'Scheduled notifications',
    );
  }

  // ─── queue helpers ─────────────────────────────────────────────────────

  private async enqueueDeliveries(input: {
    notificationId: string;
    userId: string;
    eventType: NotificationEventType;
    channels: NotificationChannel[];
    data: Record<string, unknown>;
  }): Promise<'queued' | 'inline'> {
    let mode: 'queued' | 'inline' = 'inline';
    for (const channel of input.channels) {
      const job: DeliverJobData = {
        notificationId: input.notificationId,
        userId: input.userId,
        eventType: input.eventType,
        channel,
        data: input.data,
        attempt: 1,
      };
      const result = await this.enqueueOne(job);
      if (result === 'queued') {
        mode = 'queued';
      }
    }
    return mode;
  }

  private async enqueueOne(job: DeliverJobData): Promise<'queued' | 'inline'> {
    const redisEnabled = this.configService.get('redisEnabled', {
      infer: true,
    });
    const queue = redisEnabled ? this.tryGetQueue() : undefined;

    if (queue) {
      await queue.add(NOTIFICATION_JOB_DELIVER, job, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      return 'queued';
    }

    await this.dispatcher.deliver(job);
    return 'inline';
  }

  private tryGetQueue(): Queue<DeliverJobData> | undefined {
    try {
      return this.moduleRef.get<Queue<DeliverJobData>>(
        getQueueToken(NOTIFICATIONS_QUEUE),
        { strict: false },
      );
    } catch {
      return undefined;
    }
  }

  private toPublicNotification(row: {
    _id: Types.ObjectId;
    eventType: NotificationEventType;
    title: string;
    body: string;
    data: Record<string, unknown>;
    channels: NotificationChannel[];
    isRead: boolean;
    readAt?: Date | null;
    projectId?: Types.ObjectId | null;
    entityType?: string | null;
    entityId?: string | null;
    createdAt?: Date;
  }) {
    return {
      id: String(row._id),
      eventType: row.eventType,
      title: row.title,
      body: row.body,
      data: row.data ?? {},
      channels: row.channels,
      isRead: row.isRead,
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
      projectId: row.projectId ? String(row.projectId) : null,
      entityType: row.entityType ?? null,
      entityId: row.entityId ?? null,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    };
  }

  private humanize(eventType: NotificationEventType): string {
    return eventType
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  private isDuplicateKey(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
