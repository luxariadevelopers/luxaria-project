import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { DailyDirectorDigestDeliveryStatus } from '../daily-director-digest.constants';
import type { DirectorDigestSummary } from '../daily-director-digest.types';

export type DailyDirectorDigestDocument = HydratedDocument<DailyDirectorDigest>;

@Schema({
  collection: 'daily_director_digests',
  timestamps: true,
})
export class DailyDirectorDigest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Director', default: null, index: true })
  directorId!: Types.ObjectId | null;

  /** Calendar day the digest covers (UTC midnight of that day). */
  @Prop({ type: Date, required: true, index: true })
  digestDate!: Date;

  @Prop({ type: Object, required: true })
  summary!: DirectorDigestSummary;

  @Prop({
    type: String,
    enum: DailyDirectorDigestDeliveryStatus,
    required: true,
    index: true,
  })
  deliveryStatus!: DailyDirectorDigestDeliveryStatus;

  @Prop({ type: [String], default: [] })
  channels!: string[];

  @Prop({ type: String, trim: true, default: null })
  notificationId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  lastError!: string | null;

  @Prop({ type: Date, default: null })
  sentAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DailyDirectorDigestSchema =
  SchemaFactory.createForClass(DailyDirectorDigest);

DailyDirectorDigestSchema.plugin(baseSchemaPlugin);
DailyDirectorDigestSchema.plugin(softDeletePlugin);
DailyDirectorDigestSchema.index(
  { userId: 1, digestDate: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
