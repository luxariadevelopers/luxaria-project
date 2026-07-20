import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  NotificationChannel,
  NotificationEventType,
} from '../notifications.constants';

export type NotificationPreferenceDocument =
  HydratedDocument<NotificationPreference>;

@Schema({ _id: false })
export class ChannelPreference {
  @Prop({
    type: String,
    enum: NotificationChannel,
    required: true,
  })
  channel!: NotificationChannel;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;
}

export const ChannelPreferenceSchema =
  SchemaFactory.createForClass(ChannelPreference);

@Schema({ _id: false })
export class EventPreference {
  @Prop({
    type: String,
    enum: NotificationEventType,
    required: true,
  })
  eventType!: NotificationEventType;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: [ChannelPreferenceSchema], default: [] })
  channels!: ChannelPreference[];
}

export const EventPreferenceSchema =
  SchemaFactory.createForClass(EventPreference);

@Schema({
  collection: 'notification_preferences',
  timestamps: true,
})
export class NotificationPreference {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /** Global mute — when true, only forced/system in-app may still apply. */
  @Prop({ type: Boolean, default: false })
  muted!: boolean;

  @Prop({ type: [EventPreferenceSchema], default: [] })
  events!: EventPreference[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);

NotificationPreferenceSchema.plugin(baseSchemaPlugin);
NotificationPreferenceSchema.plugin(softDeletePlugin);
