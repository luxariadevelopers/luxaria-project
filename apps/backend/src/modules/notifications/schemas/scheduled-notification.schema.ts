import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  NotificationChannel,
  NotificationEventType,
  ScheduledNotificationStatus,
} from '../notifications.constants';

export type ScheduledNotificationDocument =
  HydratedDocument<ScheduledNotification>;

@Schema({
  collection: 'scheduled_notifications',
  timestamps: true,
})
export class ScheduledNotification {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  userIds!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: NotificationEventType,
    required: true,
    index: true,
  })
  eventType!: NotificationEventType;

  @Prop({ type: Object, default: {} })
  data!: Record<string, unknown>;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [],
  })
  channels!: NotificationChannel[];

  @Prop({ type: Date, required: true, index: true })
  scheduledFor!: Date;

  @Prop({
    type: String,
    enum: ScheduledNotificationStatus,
    required: true,
    default: ScheduledNotificationStatus.Pending,
    index: true,
  })
  status!: ScheduledNotificationStatus;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  entityType!: string | null;

  @Prop({ type: String, trim: true, default: null })
  entityId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: Date, default: null })
  queuedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  lastError!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ScheduledNotificationSchema = SchemaFactory.createForClass(
  ScheduledNotification,
);

ScheduledNotificationSchema.plugin(baseSchemaPlugin);
ScheduledNotificationSchema.plugin(softDeletePlugin);
ScheduledNotificationSchema.index({ status: 1, scheduledFor: 1 });
