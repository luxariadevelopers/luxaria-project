import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  NotificationChannel,
  NotificationEventType,
} from '../notifications.constants';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  collection: 'notifications',
  timestamps: true,
})
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationEventType,
    required: true,
    index: true,
  })
  eventType!: NotificationEventType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ type: Object, default: {} })
  data!: Record<string, unknown>;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.InApp],
  })
  channels!: NotificationChannel[];

  @Prop({ type: Boolean, default: false, index: true })
  isRead!: boolean;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  entityType!: string | null;

  @Prop({ type: String, trim: true, default: null })
  entityId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.plugin(baseSchemaPlugin);
NotificationSchema.plugin(softDeletePlugin);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
