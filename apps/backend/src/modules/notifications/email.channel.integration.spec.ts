import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { hashPassword } from '../../common/utils/crypto.util';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { EmailChannel } from './channels/email.channel';
import { EmailSmtpProvider } from './channels/email-smtp.provider';
import { InAppChannel } from './channels/in-app.channel';
import { PushChannel } from './channels/push.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
} from './notifications.constants';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationsSeedService } from './notifications.seed.service';
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

/**
 * Integration test for email channel stub mode (no SMTP env).
 */
describe('EmailChannel integration (stub provider)', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let dispatcher: NotificationsDispatcher;
  let deliveryLogModel: Model<NotificationDeliveryLog>;
  let userModel: Model<User>;
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
    userModel = connection.model(User.name, UserSchema) as Model<User>;

    const configService = {
      get: (key: string) => {
        if (key === 'smtpHost') return '';
        if (key === 'emailFrom') return '';
        return undefined;
      },
    } as unknown as ConfigService<AppConfig, true>;

    const smtpProvider = new EmailSmtpProvider(configService);
    const emailChannel = new EmailChannel(
      configService,
      userModel,
      smtpProvider,
    );

    dispatcher = new NotificationsDispatcher(
      notificationModel,
      templateModel,
      preferenceModel,
      deliveryLogModel,
      new InAppChannel(),
      new PushChannel(),
      emailChannel,
      new WhatsAppChannel(),
    );

    const seedService = new NotificationsSeedService(templateModel);
    await seedService.seedDefaultTemplates();
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    const user = await userModel.create({
      userCode: 'USR-EMAIL-001',
      fullName: 'Email Test User',
      email: 'notify@luxaria.dev',
      passwordHash: await hashPassword('TestPass123!'),
      status: UserStatus.Active,
    });
    userId = String(user._id);
  });

  it('delivers email in stub mode and writes a sent delivery log', async () => {
    const notificationId = new Types.ObjectId().toHexString();

    const result = await dispatcher.deliver({
      notificationId,
      userId,
      eventType: NotificationEventType.LowStock,
      channel: NotificationChannel.Email,
      data: {
        materialName: 'Cement',
        projectName: 'Harbour',
        availableStock: 5,
      },
    });

    expect(result.status).toBe(NotificationDeliveryStatus.Sent);

    const logs = await deliveryLogModel
      .find({ userId: new Types.ObjectId(userId), channel: NotificationChannel.Email })
      .lean()
      .exec();

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe(NotificationDeliveryStatus.Sent);
    expect(logs[0].meta).toMatchObject({ provider: 'stub' });
    expect(logs[0].providerMessageId).toMatch(/^email-stub:/);
  });

  it('skips email when user preference disables the channel', async () => {
    await connection.model(NotificationPreference.name).create({
      userId: new Types.ObjectId(userId),
      muted: false,
      events: [
        {
          eventType: NotificationEventType.PaymentDue,
          enabled: true,
          channels: [{ channel: NotificationChannel.Email, enabled: false }],
        },
      ],
    });

    const result = await dispatcher.deliver({
      notificationId: new Types.ObjectId().toHexString(),
      userId,
      eventType: NotificationEventType.PaymentDue,
      channel: NotificationChannel.Email,
      data: { amount: 1000, dueDate: '2026-07-25' },
    });

    expect(result.status).toBe(NotificationDeliveryStatus.Skipped);

    const logs = await deliveryLogModel
      .find({ userId: new Types.ObjectId(userId), channel: NotificationChannel.Email })
      .lean()
      .exec();

    expect(logs[0].errorMessage).toContain('preference');
  });
});
