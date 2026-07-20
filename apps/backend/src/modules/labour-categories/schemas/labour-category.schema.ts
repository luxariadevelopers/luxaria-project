import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type LabourCategoryDocument = HydratedDocument<LabourCategory>;

export enum LabourCategoryStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum LabourSkillLevel {
  Unskilled = 'unskilled',
  SemiSkilled = 'semi_skilled',
  Skilled = 'skilled',
  HighlySkilled = 'highly_skilled',
  Supervisory = 'supervisory',
}

@Schema({
  collection: 'labour_categories',
  timestamps: true,
})
export class LabourCategory {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  categoryCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: LabourSkillLevel,
    required: true,
    index: true,
  })
  skillLevel!: LabourSkillLevel;

  /** Company-wide default daily wage */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  defaultDailyRate!: number;

  /** Company-wide default overtime rate (per day / shift unit) */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  overtimeRate!: number;

  @Prop({
    type: String,
    enum: LabourCategoryStatus,
    default: LabourCategoryStatus.Active,
    index: true,
  })
  status!: LabourCategoryStatus;

  /** Seeded standard categories */
  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LabourCategorySchema =
  SchemaFactory.createForClass(LabourCategory);

LabourCategorySchema.plugin(baseSchemaPlugin);
LabourCategorySchema.plugin(softDeletePlugin);

LabourCategorySchema.index({ status: 1, name: 1 });
LabourCategorySchema.index({ skillLevel: 1, status: 1 });
LabourCategorySchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_labour_category_name_active',
  },
);

export enum LabourCategoryRateStatus {
  Active = 'active',
  Inactive = 'inactive',
}

/**
 * Scoped rate override.
 * - company default lives on LabourCategory
 * - project-only: projectId set, contractorId null
 * - contractor-only: contractorId set, projectId null
 * - project+contractor: both set
 */
@Schema({
  collection: 'labour_category_rates',
  timestamps: true,
})
export class LabourCategoryRate {
  @Prop({
    type: Types.ObjectId,
    ref: 'LabourCategory',
    required: true,
    index: true,
  })
  labourCategoryId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', default: null, index: true })
  contractorId!: Types.ObjectId | null;

  /**
   * Deterministic uniqueness key:
   * `cat:{id}|p:{projectId|g}|c:{contractorId|g}`
   */
  @Prop({ required: true, trim: true, index: true })
  scopeKey!: string;

  @Prop({ type: Number, required: true, min: 0 })
  dailyRate!: number;

  @Prop({ type: Number, required: true, min: 0 })
  overtimeRate!: number;

  @Prop({ type: Date, required: true, index: true })
  effectiveDate!: Date;

  @Prop({
    type: String,
    enum: LabourCategoryRateStatus,
    default: LabourCategoryRateStatus.Active,
    index: true,
  })
  status!: LabourCategoryRateStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type LabourCategoryRateDocument = HydratedDocument<LabourCategoryRate>;

export const LabourCategoryRateSchema =
  SchemaFactory.createForClass(LabourCategoryRate);

LabourCategoryRateSchema.plugin(baseSchemaPlugin);
LabourCategoryRateSchema.plugin(softDeletePlugin);

LabourCategoryRateSchema.index({ labourCategoryId: 1, effectiveDate: -1 });
LabourCategoryRateSchema.index({ scopeKey: 1, effectiveDate: -1 });
LabourCategoryRateSchema.index(
  { scopeKey: 1, effectiveDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: LabourCategoryRateStatus.Active,
    },
    name: 'uniq_labour_rate_scope_effective_active',
  },
);
