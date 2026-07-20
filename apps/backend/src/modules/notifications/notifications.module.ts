import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { EmailChannel } from './channels/email.channel';
import { EmailSmtpProvider } from './channels/email-smtp.provider';
import { InAppChannel } from './channels/in-app.channel';
import { PushChannel } from './channels/push.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { PushAdapter } from './push.adapter';
import { PushTokenService } from './push-token.service';
import {
  PushDeviceToken,
  PushDeviceTokenSchema,
} from './schemas/push-device-token.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsScheduler } from './notifications.scheduler';
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

const redisEnabled =
  String(process.env.REDIS_ENABLED ?? 'false').toLowerCase() === 'true';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
      {
        name: NotificationDeliveryLog.name,
        schema: NotificationDeliveryLogSchema,
      },
      {
        name: ScheduledNotification.name,
        schema: ScheduledNotificationSchema,
      },
      { name: PushDeviceToken.name, schema: PushDeviceTokenSchema },
    ]),
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService<AppConfig, true>) => {
              const password = config.get('redisPassword', { infer: true });
              return {
                connection: {
                  host: config.get('redisHost', { infer: true }),
                  port: config.get('redisPort', { infer: true }),
                  ...(password ? { password } : {}),
                  maxRetriesPerRequest: null,
                },
              };
            },
          }),
          BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
        ]
      : []),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsDispatcher,
    NotificationsScheduler,
    NotificationsSeedService,
    PushTokenService,
    PushAdapter,
    InAppChannel,
    PushChannel,
    EmailSmtpProvider,
    EmailChannel,
    WhatsAppChannel,
    ...(redisEnabled ? [NotificationsProcessor] : []),
  ],
  exports: [NotificationsService, NotificationsDispatcher, PushTokenService],
})
export class NotificationsModule {}
