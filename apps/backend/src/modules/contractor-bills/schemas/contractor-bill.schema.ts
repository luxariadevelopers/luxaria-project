import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type ContractorBillDocument = HydratedDocument<ContractorBill>;

/**
 * Contractor Claim → Engineer Verification → PM Certification →
 * Finance Verification → Director Approval → Posted → Paid
 */
export enum ContractorBillStatus {
  Draft = 'draft',
  Claimed = 'claimed',
  EngineerVerified = 'engineer_verified',
  PmCertified = 'pm_certified',
  FinanceVerified = 'finance_verified',
  DirectorApproved = 'director_approved',
  Posted = 'posted',
  Paid = 'paid',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

@Schema({ _id: false })
export class ContractorBillPeriod {
  @Prop({ type: Date, required: true })
  from!: Date;

  @Prop({ type: Date, required: true })
  to!: Date;
}

export const ContractorBillPeriodSchema =
  SchemaFactory.createForClass(ContractorBillPeriod);

@Schema({ _id: true })
export class ContractorBillMeasurementLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WorkMeasurement', required: true })
  measurementId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  measurementNumber!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', required: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  previousQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  currentQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  cumulativeQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  /** currentQuantity × rate */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;
}

export const ContractorBillMeasurementLineSchema = SchemaFactory.createForClass(
  ContractorBillMeasurementLine,
);

@Schema({
  collection: 'contractor_bills',
  timestamps: true,
})
export class ContractorBill {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  billNumber!: string;

  /** Running account sequence for the agreement (RA-1, RA-2…). */
  @Prop({ type: Number, required: true, min: 1 })
  raNumber!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    required: true,
    index: true,
  })
  agreementId!: Types.ObjectId;

  @Prop({ type: ContractorBillPeriodSchema, required: true })
  billingPeriod!: ContractorBillPeriod;

  @Prop({ type: [ContractorBillMeasurementLineSchema], default: [] })
  measurements!: ContractorBillMeasurementLine[];

  /** Certified value before this bill (prior posted/paid RAs). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  previousCertifiedValue!: number;

  /** Gross value of this bill (Σ measurement amounts). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  currentCertifiedValue!: number;

  /** previousCertifiedValue + currentCertifiedValue */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cumulativeValue!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  advanceRecovery!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  materialRecovery!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  retention!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tds!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  penalty!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  otherDeductions!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  netPayable!: number;

  /**
   * Cumulative payments applied against netPayable.
   * Remaining payable = netPayable − paidAmount.
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  paidAmount!: number;

  /** Document id / path for contractor invoice */
  @Prop({ type: String, trim: true, default: null })
  invoiceDocument!: string | null;

  @Prop({
    type: String,
    enum: ContractorBillStatus,
    required: true,
    default: ContractorBillStatus.Draft,
    index: true,
  })
  status!: ContractorBillStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  claimedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  claimedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  engineerVerifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  engineerVerifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  pmCertifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  pmCertifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  financeVerifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  financeVerifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  directorApprovedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  directorApprovedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  paidBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorBillSchema =
  SchemaFactory.createForClass(ContractorBill);

ContractorBillSchema.plugin(baseSchemaPlugin);
ContractorBillSchema.plugin(softDeletePlugin);

ContractorBillSchema.index({ projectId: 1, status: 1, createdAt: -1 });
ContractorBillSchema.index({ contractorId: 1, status: 1 });
ContractorBillSchema.index(
  { agreementId: 1, raNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: [
          ContractorBillStatus.Draft,
          ContractorBillStatus.Claimed,
          ContractorBillStatus.EngineerVerified,
          ContractorBillStatus.PmCertified,
          ContractorBillStatus.FinanceVerified,
          ContractorBillStatus.DirectorApproved,
          ContractorBillStatus.Posted,
          ContractorBillStatus.Paid,
        ],
      },
    },
    name: 'uniq_contractor_bill_ra_number',
  },
);
ContractorBillSchema.index({
  'measurements.measurementId': 1,
});
