import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorMaterialReconciliationDocument =
  HydratedDocument<ContractorMaterialReconciliation>;

/**
 * Issued − Theoretical − ApprovedWastage − Returned = RecoverableDifference
 * → recovery document → RA bill / ledger
 */
export enum ContractorMaterialReconciliationStatus {
  Draft = 'draft',
  Approved = 'approved',
  PostedToBill = 'posted_to_bill',
}

@Schema({ _id: false })
export class MaterialReconciliationPeriod {
  @Prop({ type: Date, required: true })
  from!: Date;

  @Prop({ type: Date, required: true })
  to!: Date;
}

export const MaterialReconciliationPeriodSchema = SchemaFactory.createForClass(
  MaterialReconciliationPeriod,
);

@Schema({
  collection: 'contractor_material_reconciliations',
  timestamps: true,
})
export class ContractorMaterialReconciliation {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  /** Optional work order (Phase 6 W4); stored as ObjectId until WO module lands. */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  workOrderId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: MaterialReconciliationPeriodSchema, required: true })
  period!: MaterialReconciliationPeriod;

  /** Material issued to contractor (base unit). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  issuedQuantity!: number;

  /** Theoretical consumption from BOQ / standards (base unit). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  theoreticalConsumption!: number;

  /** Approved wastage allowance (base unit quantity, not %). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  approvedWastage!: number;

  /** Material returned from contractor (base unit). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  returnedQuantity!: number;

  /**
   * Issued − Theoretical − ApprovedWastage − Returned.
   * Positive = recoverable from contractor.
   */
  @Prop({ type: Number, required: true, default: 0 })
  recoverableDifference!: number;

  /** Unit rate used to value recoverable difference. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  unitRate!: number;

  /** max(0, recoverableDifference) × unitRate */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  recoveryAmount!: number;

  @Prop({
    type: String,
    enum: ContractorMaterialReconciliationStatus,
    required: true,
    default: ContractorMaterialReconciliationStatus.Draft,
    index: true,
  })
  status!: ContractorMaterialReconciliationStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorBill',
    default: null,
    index: true,
  })
  billId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorRecovery',
    default: null,
    index: true,
  })
  recoveryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

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

export const ContractorMaterialReconciliationSchema =
  SchemaFactory.createForClass(ContractorMaterialReconciliation);

ContractorMaterialReconciliationSchema.plugin(baseSchemaPlugin);
ContractorMaterialReconciliationSchema.plugin(softDeletePlugin);

ContractorMaterialReconciliationSchema.index({
  projectId: 1,
  contractorId: 1,
  materialId: 1,
  status: 1,
});
ContractorMaterialReconciliationSchema.index({
  projectId: 1,
  status: 1,
  createdAt: -1,
});
ContractorMaterialReconciliationSchema.index({
  'period.from': 1,
  'period.to': 1,
});
