import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../plugins/base-schema.plugin';
import { softDeletePlugin } from '../plugins/soft-delete.plugin';

export type IdempotencyKeyDocument = HydratedDocument<IdempotencyKey>;

export enum IdempotencyStatus {
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

@Schema({
  collection: 'idempotency_keys',
  timestamps: true,
})
export class IdempotencyKey {
  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ required: true, trim: true, index: true })
  scope!: string;

  @Prop({ type: String, enum: IdempotencyStatus, default: IdempotencyStatus.Processing })
  status!: IdempotencyStatus;

  @Prop({ type: String, default: null })
  requestHash!: string | null;

  @Prop({ type: Object, default: null })
  responseSnapshot!: Record<string, unknown> | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const IdempotencyKeySchema = SchemaFactory.createForClass(IdempotencyKey);

IdempotencyKeySchema.plugin(baseSchemaPlugin);
IdempotencyKeySchema.plugin(softDeletePlugin);

IdempotencyKeySchema.index({ key: 1, scope: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
IdempotencyKeySchema.index({ scope: 1, status: 1, createdAt: -1 });
