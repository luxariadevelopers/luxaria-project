import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorRecoveryDocument = HydratedDocument<ContractorRecovery>;

export enum ContractorRecoveryType {
  MobilizationAdvance = 'mobilization_advance',
  SecuredAdvance = 'secured_advance',
  Retention = 'retention',
  SecurityDeposit = 'security_deposit',
  Material = 'material',
  Equipment = 'equipment',
  ElectricityWater = 'electricity_water',
  LabourWelfare = 'labour_welfare',
  Damage = 'damage',
  Penalty = 'penalty',
  Tds = 'tds',
  GstTds = 'gst_tds',
  Manual = 'manual',
}

export enum ContractorRecoveryStatus {
  Draft = 'draft',
  Approved = 'approved',
  Posted = 'posted',
}

@Schema({
  collection: 'contractor_recoveries',
  timestamps: true,
})
export class ContractorRecovery {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  workOrderId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ContractorRecoveryType,
    required: true,
    index: true,
  })
  type!: ContractorRecoveryType;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, maxlength: 500, default: null })
  description!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  /** Optional link to running bill when recovery is applied. */
  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorBill',
    default: null,
    index: true,
  })
  billId!: Types.ObjectId | null;

  /** Source material reconciliation when type = material. */
  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorMaterialReconciliation',
    default: null,
    index: true,
  })
  materialReconciliationId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ContractorRecoveryStatus,
    required: true,
    default: ContractorRecoveryStatus.Draft,
    index: true,
  })
  status!: ContractorRecoveryStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorRecoverySchema =
  SchemaFactory.createForClass(ContractorRecovery);

ContractorRecoverySchema.plugin(baseSchemaPlugin);
ContractorRecoverySchema.plugin(softDeletePlugin);

ContractorRecoverySchema.index({
  projectId: 1,
  contractorId: 1,
  type: 1,
  status: 1,
});
ContractorRecoverySchema.index({ projectId: 1, status: 1, createdAt: -1 });
ContractorRecoverySchema.index({ billId: 1, status: 1 });
