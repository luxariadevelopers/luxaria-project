import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  NotificationChannel,
  NotificationEventType,
} from '../notifications.constants';

export type NotificationTemplateDocument =
  HydratedDocument<NotificationTemplate>;

@Schema({
  collection: 'notification_templates',
  timestamps: true,
})
export class NotificationTemplate {
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

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  /** Placeholder keys supported in subject/body, e.g. projectName, amount */
  @Prop({ type: [String], default: [] })
  variables!: string[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationTemplateSchema =
  SchemaFactory.createForClass(NotificationTemplate);

NotificationTemplateSchema.plugin(baseSchemaPlugin);
NotificationTemplateSchema.plugin(softDeletePlugin);
NotificationTemplateSchema.index(
  { eventType: 1, channel: 1 },
  { unique: true, name: 'uniq_notification_template_event_channel' },
);
