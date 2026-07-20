import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type MaterialConsumptionStandardDocument =
  HydratedDocument<MaterialConsumptionStandard>;

export enum MaterialConsumptionStandardStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Active = 'active',
  Superseded = 'superseded',
  Rejected = 'rejected',
}

@Schema({
  collection: 'material_consumption_standards',
  timestamps: true,
})
export class MaterialConsumptionStandard {
  @Prop({ required: true, trim: true, uppercase: true, unique: true })
  standardNumber!: string;

  /**
   * Identity key for versioning / one-active rule.
   * Global: `g|boq:{id}|mat:{id}|{unit}` or `g|wt:{workType}|mat:{id}|{unit}`
   * Project: `p:{projectId}|…`
   */
  @Prop({ required: true, trim: true, index: true })
  scopeKey!: string;

  /** null = company-wide standard; set = project-specific override */
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Boolean, required: true, default: false })
  isProjectOverride!: boolean;

  /** Optional link to the global standard this project row overrides. */
  @Prop({
    type: Types.ObjectId,
    ref: 'MaterialConsumptionStandard',
    default: null,
  })
  overridesStandardId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', default: null, index: true })
  boqItemId!: Types.ObjectId | null;

  /** Free-text work type when not tied to a specific BOQ item (e.g. Brick masonry). */
  @Prop({ type: String, trim: true, default: null, index: true })
  workType!: string | null;

  @Prop({ type: String, enum: BoqUnit, required: true })
  outputUnit!: BoqUnit;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  /** Standard consumption quantity per 1 output unit (e.g. 8 bricks / sqft). */
  @Prop({ type: Number, required: true, min: 0 })
  quantityPerUnit!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  wastagePercentage!: number;

  @Prop({ type: Date, required: true, index: true })
  effectiveDate!: Date;

  @Prop({ type: Number, required: true, min: 1 })
  version!: number;

  @Prop({
    type: String,
    enum: MaterialConsumptionStandardStatus,
    required: true,
    default: MaterialConsumptionStandardStatus.Draft,
    index: true,
  })
  status!: MaterialConsumptionStandardStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'MaterialConsumptionStandard',
    default: null,
  })
  basedOnStandardId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  approvalReference!: string | null;

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

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MaterialConsumptionStandardSchema = SchemaFactory.createForClass(
  MaterialConsumptionStandard,
);
MaterialConsumptionStandardSchema.plugin(baseSchemaPlugin);
MaterialConsumptionStandardSchema.plugin(softDeletePlugin);

MaterialConsumptionStandardSchema.index(
  { scopeKey: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active', isDeleted: false },
    name: 'uniq_mcs_one_active_per_scope',
  },
);
MaterialConsumptionStandardSchema.index(
  { scopeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['draft', 'pending_approval'] },
      isDeleted: false,
    },
    name: 'uniq_mcs_one_open_per_scope',
  },
);
MaterialConsumptionStandardSchema.index({ scopeKey: 1, version: 1 });
