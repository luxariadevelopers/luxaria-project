import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type RateContractDocument = HydratedDocument<RateContract>;

export enum RateContractScope {
  Company = 'company',
  Project = 'project',
}

export enum RateContractStatus {
  Draft = 'draft',
  Active = 'active',
  Expired = 'expired',
  Superseded = 'superseded',
  Terminated = 'terminated',
}

@Schema({ _id: true })
export class RateContractBoqItemRate {
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
  rate!: number;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const RateContractBoqItemRateSchema = SchemaFactory.createForClass(
  RateContractBoqItemRate,
);

@Schema({ _id: true })
export class RateContractLabourRate {
  _id?: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  skill!: string;

  @Prop({ type: String, trim: true, default: null })
  category!: string | null;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const RateContractLabourRateSchema = SchemaFactory.createForClass(
  RateContractLabourRate,
);

@Schema({ _id: true })
export class RateContractMaterialInclusiveRate {
  _id?: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({ type: [String], default: [] })
  includesMaterials!: string[];

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const RateContractMaterialInclusiveRateSchema =
  SchemaFactory.createForClass(RateContractMaterialInclusiveRate);

@Schema({ _id: true })
export class RateContractEquipmentRate {
  _id?: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  equipmentType!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({ type: Boolean, default: false })
  withOperator!: boolean;

  @Prop({ type: Boolean, default: false })
  fuelInclusive!: boolean;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const RateContractEquipmentRateSchema = SchemaFactory.createForClass(
  RateContractEquipmentRate,
);

@Schema({ _id: false })
export class RateContractEscalationClause {
  @Prop({ type: String, trim: true, default: null })
  indexName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  formula!: string | null;

  @Prop({ type: Date, default: null })
  baseDate!: Date | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const RateContractEscalationClauseSchema = SchemaFactory.createForClass(
  RateContractEscalationClause,
);

@Schema({ _id: false })
export class RateContractTaxConfig {
  @Prop({ type: Number, min: 0, max: 100, default: null })
  gstPercent!: number | null;

  @Prop({ type: Boolean, default: false })
  gstInclusive!: boolean;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  tdsPercent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const RateContractTaxConfigSchema =
  SchemaFactory.createForClass(RateContractTaxConfig);

@Schema({ _id: false })
export class RateContractAdvanceRecovery {
  @Prop({ type: String, trim: true, default: null })
  method!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percentPerBill!: number | null;

  @Prop({ type: Number, min: 1, default: null })
  startAfterBillNumber!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const RateContractAdvanceRecoverySchema = SchemaFactory.createForClass(
  RateContractAdvanceRecovery,
);

@Schema({ _id: false })
export class RateContractPenaltyRules {
  @Prop({ type: Number, min: 0, max: 100, default: null })
  ldPercentPerDay!: number | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  ldCapPercent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const RateContractPenaltyRulesSchema = SchemaFactory.createForClass(
  RateContractPenaltyRules,
);

@Schema({ _id: false })
export class RateContractSecurityDeposit {
  @Prop({ type: Number, min: 0, default: null })
  amount!: number | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  instrumentType!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const RateContractSecurityDepositSchema = SchemaFactory.createForClass(
  RateContractSecurityDeposit,
);

@Schema({
  collection: 'rate_contracts',
  timestamps: true,
})
export class RateContract {
  /** Stable human code across versions, e.g. RC-2026-000001 */
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  contractNumber!: string;

  @Prop({ type: Number, required: true, min: 1, index: true })
  version!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'RateContract',
    default: null,
  })
  supersedesId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  /**
   * Null when scope = company (company-wide schedule of rates).
   * Required when scope = project.
   */
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: RateContractScope,
    required: true,
    index: true,
  })
  scope!: RateContractScope;

  @Prop({ type: String, trim: true, default: null })
  title!: string | null;

  @Prop({ type: [RateContractBoqItemRateSchema], default: [] })
  boqItemRates!: RateContractBoqItemRate[];

  @Prop({ type: [RateContractLabourRateSchema], default: [] })
  labourRates!: RateContractLabourRate[];

  @Prop({ type: [RateContractMaterialInclusiveRateSchema], default: [] })
  materialInclusiveRates!: RateContractMaterialInclusiveRate[];

  @Prop({ type: [RateContractEquipmentRateSchema], default: [] })
  equipmentRates!: RateContractEquipmentRate[];

  @Prop({ type: Date, required: true, index: true })
  validityFrom!: Date;

  @Prop({ type: Date, required: true, index: true })
  validityTo!: Date;

  @Prop({ type: [RateContractEscalationClauseSchema], default: [] })
  escalationClauses!: RateContractEscalationClause[];

  @Prop({ type: RateContractTaxConfigSchema, default: () => ({}) })
  taxConfig!: RateContractTaxConfig;

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  retentionPercent!: number;

  @Prop({ type: RateContractSecurityDepositSchema, default: () => ({}) })
  securityDeposit!: RateContractSecurityDeposit;

  @Prop({ type: RateContractAdvanceRecoverySchema, default: () => ({}) })
  advanceRecovery!: RateContractAdvanceRecovery;

  @Prop({ type: RateContractPenaltyRulesSchema, default: () => ({}) })
  penaltyRules!: RateContractPenaltyRules;

  @Prop({
    type: String,
    enum: RateContractStatus,
    required: true,
    default: RateContractStatus.Draft,
    index: true,
  })
  status!: RateContractStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  activatedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  activatedAt!: Date | null;

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

export const RateContractSchema = SchemaFactory.createForClass(RateContract);

RateContractSchema.plugin(baseSchemaPlugin);
RateContractSchema.plugin(softDeletePlugin);

RateContractSchema.index({ contractorId: 1, scope: 1, status: 1 });
RateContractSchema.index({ projectId: 1, contractorId: 1, status: 1 });
RateContractSchema.index({ contractNumber: 1, version: -1 });
RateContractSchema.index({ validityTo: 1, status: 1 });
RateContractSchema.index(
  { contractNumber: 1 },
  {
    name: 'one_active_rate_contract_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: RateContractStatus.Active,
    },
  },
);
RateContractSchema.index(
  { contractNumber: 1 },
  {
    name: 'one_open_rate_contract_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: RateContractStatus.Draft,
    },
  },
);
