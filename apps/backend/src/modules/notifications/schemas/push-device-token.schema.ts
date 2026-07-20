import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export enum PushDevicePlatform {
  Ios = 'ios',
  Android = 'android',
}

export type PushDeviceTokenDocument = HydratedDocument<PushDeviceToken>;

@Schema({
  collection: 'push_device_tokens',
  timestamps: true,
})
export class PushDeviceToken {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /** Expo push token (ExponentPushToken[...]). */
  @Prop({ type: String, required: true, unique: true, trim: true })
  token!: string;

  @Prop({
    type: String,
    enum: PushDevicePlatform,
    required: true,
  })
  platform!: PushDevicePlatform;

  @Prop({ type: String, default: null, trim: true })
  deviceName!: string | null;

  @Prop({ type: Date, default: null, index: true })
  invalidatedAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastUsedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PushDeviceTokenSchema =
  SchemaFactory.createForClass(PushDeviceToken);

PushDeviceTokenSchema.plugin(baseSchemaPlugin);
PushDeviceTokenSchema.plugin(softDeletePlugin);
PushDeviceTokenSchema.index({ userId: 1, invalidatedAt: 1 });
