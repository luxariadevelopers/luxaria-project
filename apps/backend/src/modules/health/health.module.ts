import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NotificationDeliveryLog,
  NotificationDeliveryLogSchema,
} from '../notifications/schemas/notification-delivery-log.schema';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotificationDeliveryLog.name,
        schema: NotificationDeliveryLogSchema,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
