import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type TdsDeductionDocument = HydratedDocument<TdsDeduction>;

export enum TdsPartyType {
  Vendor = 'vendor',
  Contractor = 'contractor',
  Other = 'other',
}

export enum TdsDeducteeType {
  Company = 'company',
  Individual = 'individual',
  Other = 'other',
}

export enum TdsDeductionStatus {
  Withheld = 'withheld',
  Deposited = 'deposited',
  Certified = 'certified',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'tds_deductions',
  timestamps: true,
})
export class TdsDeduction {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  deductionNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'TdsSection', required: true, index: true })
  sectionId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  sectionCode!: string;

  @Prop({ type: String, enum: TdsPartyType, required: true, index: true })
  partyType!: TdsPartyType;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  partyId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, required: true })
  partyName!: string;

  @Prop({ type: String, trim: true, default: null })
  partyPan!: string | null;

  @Prop({ type: String, enum: TdsDeducteeType, required: true })
  deducteeType!: TdsDeducteeType;

  @Prop({ type: Date, required: true, index: true })
  transactionDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  transactionAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  tdsAmount!: number;

  @Prop({ type: String, trim: true, default: null, index: true })
  sourceModule!: string | null;

  @Prop({ type: String, trim: true, default: null })
  sourceEntityType!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  sourceEntityId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  challanNumber!: string | null;

  @Prop({ type: Date, default: null })
  challanDate!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  bsrCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  certificateNumber!: string | null;

  @Prop({
    type: String,
    enum: TdsDeductionStatus,
    required: true,
    default: TdsDeductionStatus.Withheld,
    index: true,
  })
  status!: TdsDeductionStatus;

  @Prop({ type: Types.ObjectId, ref: 'Journal', default: null, index: true })
  journalEntryId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TdsDeductionSchema = SchemaFactory.createForClass(TdsDeduction);

TdsDeductionSchema.plugin(baseSchemaPlugin);
TdsDeductionSchema.plugin(softDeletePlugin);

TdsDeductionSchema.index({ companyId: 1, transactionDate: -1, status: 1 });
TdsDeductionSchema.index({ companyId: 1, sectionCode: 1, transactionDate: -1 });
