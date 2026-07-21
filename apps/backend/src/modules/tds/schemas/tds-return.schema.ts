import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type TdsReturnDocument = HydratedDocument<TdsReturn>;

export enum TdsFormType {
  Form26q = 'form26q',
  Form24q = 'form24q',
  Form27q = 'form27q',
}

export enum TdsQuarter {
  Q1 = 'q1',
  Q2 = 'q2',
  Q3 = 'q3',
  Q4 = 'q4',
}

export enum TdsReturnStatus {
  Draft = 'draft',
  Computed = 'computed',
  Filed = 'filed',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'tds_returns',
  timestamps: true,
})
export class TdsReturn {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  returnNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: TdsFormType, required: true, index: true })
  formType!: TdsFormType;

  @Prop({ type: String, enum: TdsQuarter, required: true, index: true })
  quarter!: TdsQuarter;

  @Prop({ required: true, trim: true, index: true })
  financialYearLabel!: string;

  @Prop({
    type: String,
    enum: TdsReturnStatus,
    required: true,
    default: TdsReturnStatus.Draft,
    index: true,
  })
  status!: TdsReturnStatus;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalDeductees!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalTransactionAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalTds!: number;

  @Prop({ type: String, trim: true, default: null })
  acknowledgementNumber!: string | null;

  @Prop({ type: Date, default: null })
  filedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TdsReturnSchema = SchemaFactory.createForClass(TdsReturn);

TdsReturnSchema.plugin(baseSchemaPlugin);
TdsReturnSchema.plugin(softDeletePlugin);

TdsReturnSchema.index(
  { companyId: 1, formType: 1, financialYearLabel: 1, quarter: 1 },
  { unique: true },
);
