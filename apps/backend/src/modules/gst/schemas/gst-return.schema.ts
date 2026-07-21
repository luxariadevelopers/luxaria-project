import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type GstReturnDocument = HydratedDocument<GstReturn>;

export enum GstReturnType {
  Gstr1 = 'gstr1',
  Gstr3b = 'gstr3b',
  Gstr2b = 'gstr2b',
}

export enum GstReturnStatus {
  Draft = 'draft',
  Computed = 'computed',
  Filed = 'filed',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'gst_returns',
  timestamps: true,
})
export class GstReturn {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  returnNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: GstReturnType, required: true, index: true })
  returnType!: GstReturnType;

  @Prop({ type: Number, required: true, min: 1, max: 12, index: true })
  periodMonth!: number;

  @Prop({ type: Number, required: true, min: 2000, index: true })
  periodYear!: number;

  @Prop({
    type: String,
    enum: GstReturnStatus,
    required: true,
    default: GstReturnStatus.Draft,
    index: true,
  })
  status!: GstReturnStatus;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxableOutward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cgstOutward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sgstOutward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  igstOutward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxableInward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cgstInward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sgstInward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  igstInward!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  itcAvailable!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxPayable!: number;

  @Prop({ type: Date, default: null })
  filedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  acknowledgementNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GstReturnSchema = SchemaFactory.createForClass(GstReturn);

GstReturnSchema.plugin(baseSchemaPlugin);
GstReturnSchema.plugin(softDeletePlugin);

GstReturnSchema.index(
  { companyId: 1, returnType: 1, periodYear: 1, periodMonth: 1 },
  { unique: true },
);
