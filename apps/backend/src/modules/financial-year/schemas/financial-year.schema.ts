import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type FinancialYearDocument = HydratedDocument<FinancialYear>;

export enum FinancialYearStatus {
  Open = 'open',
  Closed = 'closed',
  Locked = 'locked',
}

@Schema({
  collection: 'financial_years',
  timestamps: true,
})
export class FinancialYear {
  /** Optional company scope — supports multi-company later; null = global/primary tenant */
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Date, required: true, index: true })
  startDate!: Date;

  @Prop({ type: Date, required: true, index: true })
  endDate!: Date;

  @Prop({
    type: String,
    enum: FinancialYearStatus,
    default: FinancialYearStatus.Open,
    index: true,
  })
  status!: FinancialYearStatus;

  @Prop({ type: Boolean, default: false })
  isCurrent!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isLocked!: boolean;

  @Prop({ type: Date, default: null })
  lockedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  lockedBy!: Types.ObjectId | null;
}

export const FinancialYearSchema = SchemaFactory.createForClass(FinancialYear);

FinancialYearSchema.plugin(baseSchemaPlugin);
FinancialYearSchema.plugin(softDeletePlugin);

FinancialYearSchema.index(
  { companyId: 1, isCurrent: 1 },
  {
    name: 'one_current_financial_year',
    unique: true,
    partialFilterExpression: { isCurrent: true, isDeleted: false },
  },
);

FinancialYearSchema.index({ companyId: 1, startDate: 1, endDate: 1 });
FinancialYearSchema.index({ name: 1, companyId: 1 });
