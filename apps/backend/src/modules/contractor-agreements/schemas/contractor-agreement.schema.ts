import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type ContractorAgreementDocument = HydratedDocument<ContractorAgreement>;

export enum ContractorAgreementStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Active = 'active',
  Superseded = 'superseded',
  Rejected = 'rejected',
  Expired = 'expired',
  Terminated = 'terminated',
}

export enum ContractorAgreementBillingCycle {
  Weekly = 'weekly',
  Fortnightly = 'fortnightly',
  Monthly = 'monthly',
  Milestone = 'milestone',
  Completion = 'completion',
}

@Schema({ _id: true })
export class AgreementBoqItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', default: null })
  boqItemId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  agreedQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  agreedRate!: number;

  /** agreedQuantity × agreedRate */
  @Prop({ type: Number, required: true, min: 0 })
  agreedValue!: number;
}

export const AgreementBoqItemSchema =
  SchemaFactory.createForClass(AgreementBoqItem);

@Schema({ _id: false })
export class AgreementSkillMixEntry {
  @Prop({ type: String, trim: true, required: true })
  skill!: string;

  @Prop({ type: Number, required: true, min: 0 })
  headcount!: number;
}

export const AgreementSkillMixEntrySchema = SchemaFactory.createForClass(
  AgreementSkillMixEntry,
);

@Schema({ _id: false })
export class AgreementAdvance {
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  terms!: string | null;
}

export const AgreementAdvanceSchema =
  SchemaFactory.createForClass(AgreementAdvance);

@Schema({ _id: false })
export class AgreementRecoveryPlan {
  @Prop({ type: String, trim: true, default: null })
  method!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percentPerBill!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const AgreementRecoveryPlanSchema = SchemaFactory.createForClass(
  AgreementRecoveryPlan,
);

@Schema({
  collection: 'contractor_agreements',
  timestamps: true,
})
export class ContractorAgreement {
  /** Stable human code across versions, e.g. CA-2026-000001 */
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  agreementNumber!: string;

  @Prop({ type: Number, required: true, min: 1, index: true })
  version!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    default: null,
  })
  supersedesId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  workScope!: string;

  @Prop({ type: [AgreementBoqItemSchema], default: [] })
  boqItems!: AgreementBoqItem[];

  /** Σ agreedValue of lines */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  agreedRatesTotal!: number;

  /** Σ agreedQuantity of lines */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  agreedQuantity!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  manpowerCommitment!: number;

  @Prop({ type: [AgreementSkillMixEntrySchema], default: [] })
  skillMix!: AgreementSkillMixEntry[];

  @Prop({ type: Date, required: true, index: true })
  startDate!: Date;

  @Prop({ type: Date, required: true, index: true })
  endDate!: Date;

  @Prop({
    type: String,
    enum: ContractorAgreementBillingCycle,
    required: true,
    default: ContractorAgreementBillingCycle.Monthly,
  })
  billingCycle!: ContractorAgreementBillingCycle;

  @Prop({ type: AgreementAdvanceSchema, default: () => ({ amount: 0 }) })
  advance!: AgreementAdvance;

  @Prop({ type: AgreementRecoveryPlanSchema, default: () => ({}) })
  recoveryPlan!: AgreementRecoveryPlan;

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  retentionPercentage!: number;

  @Prop({ type: String, trim: true, default: null })
  penalties!: string | null;

  @Prop({ type: String, trim: true, default: null })
  safetyTerms!: string | null;

  @Prop({ type: String, trim: true, default: null })
  terminationTerms!: string | null;

  /** Stored document id / relative path for signed agreement PDF */
  @Prop({ type: String, trim: true, default: null })
  agreementDocument!: string | null;

  @Prop({
    type: String,
    enum: ContractorAgreementStatus,
    required: true,
    default: ContractorAgreementStatus.Draft,
    index: true,
  })
  status!: ContractorAgreementStatus;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  terminatedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  terminatedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  terminationReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorAgreementSchema = SchemaFactory.createForClass(
  ContractorAgreement,
);

ContractorAgreementSchema.plugin(baseSchemaPlugin);
ContractorAgreementSchema.plugin(softDeletePlugin);

ContractorAgreementSchema.index({
  projectId: 1,
  agreementNumber: 1,
  version: -1,
});
ContractorAgreementSchema.index({ projectId: 1, contractorId: 1, status: 1 });
ContractorAgreementSchema.index({ endDate: 1, status: 1 });
ContractorAgreementSchema.index(
  { projectId: 1, agreementNumber: 1 },
  {
    name: 'one_active_contractor_agreement_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: ContractorAgreementStatus.Active,
    },
  },
);
ContractorAgreementSchema.index(
  { projectId: 1, agreementNumber: 1 },
  {
    name: 'one_open_contractor_agreement_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: [
          ContractorAgreementStatus.Draft,
          ContractorAgreementStatus.PendingApproval,
          ContractorAgreementStatus.Rejected,
        ],
      },
    },
  },
);

export enum ContractorAgreementExpiryAlertType {
  ExpiringSoon = 'expiring_soon',
  ExpiringCritical = 'expiring_critical',
  Expired = 'expired',
}

@Schema({
  collection: 'contractor_agreement_expiry_alerts',
  timestamps: true,
})
export class ContractorAgreementExpiryAlert {
  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    required: true,
    index: true,
  })
  agreementId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  agreementNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  endDate!: Date;

  @Prop({
    type: String,
    enum: ContractorAgreementExpiryAlertType,
    required: true,
    index: true,
  })
  alertType!: ContractorAgreementExpiryAlertType;

  @Prop({ type: String, trim: true, required: true })
  message!: string;

  @Prop({ type: Number, required: true })
  daysRemaining!: number;

  @Prop({ type: Boolean, default: false, index: true })
  acknowledged!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acknowledgedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ContractorAgreementExpiryAlertDocument =
  HydratedDocument<ContractorAgreementExpiryAlert>;

export const ContractorAgreementExpiryAlertSchema =
  SchemaFactory.createForClass(ContractorAgreementExpiryAlert);

ContractorAgreementExpiryAlertSchema.plugin(baseSchemaPlugin);
ContractorAgreementExpiryAlertSchema.plugin(softDeletePlugin);
ContractorAgreementExpiryAlertSchema.index(
  { agreementId: 1, alertType: 1 },
  { unique: true, name: 'uniq_contractor_agreement_expiry_alert' },
);
