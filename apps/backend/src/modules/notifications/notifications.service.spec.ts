import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmailChannel } from './channels/email.channel';
import { EmailSmtpProvider } from './channels/email-smtp.provider';
import { InAppChannel } from './channels/in-app.channel';
import { PushChannel } from './channels/push.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import {
  ALL_NOTIFICATION_EVENTS,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  ScheduledNotificationStatus,
} from './notifications.constants';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationsSeedService } from './notifications.seed.service';
import { NotificationsService } from './notifications.service';
import {
  NotificationDeliveryLog,
  NotificationDeliveryLogSchema,
} from './schemas/notification-delivery-log.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  ScheduledNotification,
  ScheduledNotificationSchema,
} from './schemas/scheduled-notification.schema';

describe('NotificationsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: NotificationsService;
  let dispatcher: NotificationsDispatcher;
  let seedService: NotificationsSeedService;
  let deliveryLogModel: Model<NotificationDeliveryLog>;
  let userId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const notificationModel = connection.model(
      Notification.name,
      NotificationSchema,
    ) as Model<Notification>;
    const templateModel = connection.model(
      NotificationTemplate.name,
      NotificationTemplateSchema,
    ) as Model<NotificationTemplate>;
    const preferenceModel = connection.model(
      NotificationPreference.name,
      NotificationPreferenceSchema,
    ) as Model<NotificationPreference>;
    deliveryLogModel = connection.model(
      NotificationDeliveryLog.name,
      NotificationDeliveryLogSchema,
    ) as Model<NotificationDeliveryLog>;
    const scheduledModel = connection.model(
      ScheduledNotification.name,
      ScheduledNotificationSchema,
    ) as Model<ScheduledNotification>;
    const userModel = connection.model(User.name, UserSchema) as Model<User>;

    const configService = {
      get: (key: string) => {
        if (key === 'redisEnabled') return false;
        if (key === 'smtpHost') return '';
        if (key === 'emailFrom') return '';
        return undefined;
      },
    } as unknown as ConfigService<AppConfig, true>;

    const smtpProvider = new EmailSmtpProvider(configService);

    dispatcher = new NotificationsDispatcher(
      notificationModel,
      templateModel,
      preferenceModel,
      deliveryLogModel,
      new InAppChannel(),
      new PushChannel(),
      new EmailChannel(configService, userModel, smtpProvider),
      new WhatsAppChannel(),
    );

    const moduleRef = {
      get: () => {
        throw new Error('queue unavailable');
      },
    } as unknown as ModuleRef;

    service = new NotificationsService(
      notificationModel,
      templateModel,
      preferenceModel,
      deliveryLogModel,
      scheduledModel,
      dispatcher,
      configService,
      moduleRef,
    );

    seedService = new NotificationsSeedService(templateModel);
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    userId = new Types.ObjectId().toHexString();
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
    await seedService.seedDefaultTemplates();
  });

  it('seeds templates for all events and channels', async () => {
    const templates = await service.listTemplates();
    expect(templates.data!.length).toBe(ALL_NOTIFICATION_EVENTS.length * 4);
  });

  it('sends in-app/push/email inline, writes delivery logs, and supports read/unread', async () => {
    const sent = await service.send({
      eventType: NotificationEventType.LowStock,
      userIds: [userId],
      data: {
        materialName: 'Cement',
        projectName: 'Harbour',
        availableStock: 5,
      },
      channels: [
        NotificationChannel.InApp,
        NotificationChannel.Push,
        NotificationChannel.Email,
      ],
    });

    expect(sent.data).toHaveLength(1);
    expect(sent.data![0].mode).toBe('inline');
    expect(sent.data![0].channels).toEqual(
      expect.arrayContaining([
        NotificationChannel.InApp,
        NotificationChannel.Push,
        NotificationChannel.Email,
      ]),
    );

    const inbox = await service.listInbox(userId, { unreadOnly: true });
    expect(inbox.data).toHaveLength(1);
    expect(inbox.data![0].isRead).toBe(false);
    expect(inbox.data![0].title).toContain('Cement');

    const logs = await service.listDeliveryLogs({ userId });
    expect(logs.data!.length).toBeGreaterThanOrEqual(3);
    expect(
      logs.data!.every(
        (l) =>
          l.status === NotificationDeliveryStatus.Sent ||
          l.status === NotificationDeliveryStatus.Skipped,
      ),
    ).toBe(true);

    await service.markRead(inbox.data![0].id, userId);
    const after = await service.listInbox(userId, { unreadOnly: true });
    expect(after.data).toHaveLength(0);
  });

  it('respects user preferences (disable email)', async () => {
    await service.updatePreferences(userId, {
      events: [
        {
          eventType: NotificationEventType.PaymentDue,
          enabled: true,
          channels: [
            { channel: NotificationChannel.InApp, enabled: true },
            { channel: NotificationChannel.Email, enabled: false },
            { channel: NotificationChannel.Push, enabled: false },
          ],
        },
      ],
    });

    const sent = await service.send({
      eventType: NotificationEventType.PaymentDue,
      userIds: [userId],
      data: { amount: 1000, dueDate: '2026-07-25', projectName: 'A' },
      channels: [
        NotificationChannel.InApp,
        NotificationChannel.Email,
        NotificationChannel.Push,
      ],
    });

    expect(sent.data![0].channels).toEqual([NotificationChannel.InApp]);
  });

  it('schedules future notifications and processes when due', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const scheduled = await service.schedule({
      eventType: NotificationEventType.BudgetOverrun,
      userIds: [userId],
      scheduledFor: future,
      data: {
        projectName: 'Skyline',
        fundsUtilised: 2_000_000,
        budgetAmount: 1_500_000,
      },
    });

    const scheduledJob = scheduled.data as {
      id: string;
      status: ScheduledNotificationStatus;
    };
    expect(scheduledJob.status).toBe(ScheduledNotificationStatus.Pending);

    // Force due
    await connection.model(ScheduledNotification.name).updateOne(
      { _id: scheduledJob.id },
      { $set: { scheduledFor: new Date(Date.now() - 1000) } },
    );

    const processed = await service.processDueScheduled();
    expect(processed.processedCount).toBe(1);

    const inbox = await service.listInbox(userId, {});
    expect(inbox.data!.some((n) => n.eventType === 'budget_overrun')).toBe(
      true,
    );
  });

  it('retries a delivery from logs', async () => {
    await service.send({
      eventType: NotificationEventType.MissingDpr,
      userIds: [userId],
      data: { projectName: 'Alpha', reportDate: '2026-07-19' },
      channels: [NotificationChannel.InApp],
    });

    const logs = await service.listDeliveryLogs({
      userId,
      channel: NotificationChannel.InApp,
    });
    expect(logs.data!.length).toBeGreaterThan(0);

    const retry = await service.retryDelivery(logs.data![0].id, true);
    expect(retry.data?.mode).toBe('inline');

    const after = await service.listDeliveryLogs({
      userId,
      channel: NotificationChannel.InApp,
    });
    expect(after.data!.length).toBeGreaterThan(logs.data!.length);
  });

  it('skips WhatsApp by default and records placeholder skip when forced', async () => {
    await service.updatePreferences(userId, {
      events: [
        {
          eventType: NotificationEventType.LabourShortfall,
          enabled: true,
          channels: [
            { channel: NotificationChannel.WhatsApp, enabled: true },
            { channel: NotificationChannel.InApp, enabled: true },
          ],
        },
      ],
    });

    await service.send({
      eventType: NotificationEventType.LabourShortfall,
      userIds: [userId],
      data: { projectName: 'Site', message: 'Below 60%' },
      channels: [NotificationChannel.WhatsApp, NotificationChannel.InApp],
    });

    const logs = await service.listDeliveryLogs({
      userId,
      channel: NotificationChannel.WhatsApp,
    });
    expect(logs.data![0].status).toBe(NotificationDeliveryStatus.Skipped);
  });
});
