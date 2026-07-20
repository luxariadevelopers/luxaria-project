import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
} from '../notifications.constants';

export type NotificationDeliveryLogDocument =
  HydratedDocument<NotificationDeliveryLog>;

@Schema({
  collection: 'notification_delivery_logs',
  timestamps: true,
})
export class NotificationDeliveryLog {
  @Prop({
    type: Types.ObjectId,
    ref: 'Notification',
    default: null,
    index: true,
  })
  notificationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationEventType,
    required: true,
    index: true,
  })
  eventType!: NotificationEventType;

  @Prop({
    type: String,
    enum: NotificationChannel,
    required: true,
    index: true,
  })
  channel!: NotificationChannel;

  @Prop({
    type: String,
    enum: NotificationDeliveryStatus,
    required: true,
    index: true,
  })
  status!: NotificationDeliveryStatus;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  attempt!: number;

  @Prop({ type: String, trim: true, default: null })
  providerMessageId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  errorMessage!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  jobId!: string | null;

  @Prop({ type: Date, default: null })
  sentAt!: Date | null;

  @Prop({ type: Object, default: {} })
  meta!: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationDeliveryLogSchema = SchemaFactory.createForClass(
  NotificationDeliveryLog,
);

NotificationDeliveryLogSchema.plugin(baseSchemaPlugin);
NotificationDeliveryLogSchema.plugin(softDeletePlugin);
NotificationDeliveryLogSchema.index({
  userId: 1,
  channel: 1,
  createdAt: -1,
});
