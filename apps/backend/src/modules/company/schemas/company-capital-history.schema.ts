import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CompanyCapitalHistoryDocument = HydratedDocument<CompanyCapitalHistory>;

export enum CompanyCapitalType {
  Authorised = 'authorised',
  PaidUp = 'paid_up',
}

/**
 * Append-only capital change log.
 * Historical rows must never be overwritten — only new rows are inserted.
 */
@Schema({
  collection: 'company_capital_history',
  timestamps: true,
})
export class CompanyCapitalHistory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: CompanyCapitalType, required: true, index: true })
  capitalType!: CompanyCapitalType;

  @Prop({ type: Number, required: true, min: 0 })
  previousAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  newAmount!: number;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  @Prop({ type: String, trim: true, default: null })
  changeReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  reference!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyCapitalHistorySchema =
  SchemaFactory.createForClass(CompanyCapitalHistory);

CompanyCapitalHistorySchema.plugin(baseSchemaPlugin);
CompanyCapitalHistorySchema.plugin(softDeletePlugin);

CompanyCapitalHistorySchema.index({ companyId: 1, capitalType: 1, effectiveFrom: -1 });
