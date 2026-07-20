import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type BoqBlockDocument = HydratedDocument<BoqBlock>;
export type BoqFloorDocument = HydratedDocument<BoqFloor>;
export type BoqWorkCategoryDocument = HydratedDocument<BoqWorkCategory>;
export type BoqItemDocument = HydratedDocument<BoqItem>;

export enum BoqUnit {
  Number = 'number',
  Bag = 'bag',
  Kilogram = 'kilogram',
  Ton = 'ton',
  Litre = 'litre',
  Metre = 'metre',
  SquareFoot = 'square_foot',
  CubicFoot = 'cubic_foot',
  SquareMetre = 'square_metre',
  CubicMetre = 'cubic_metre',
  RunningMetre = 'running_metre',
  Load = 'load',
  Box = 'box',
  Job = 'job',
  Day = 'day',
  LumpSum = 'lump_sum',
}

export enum BoqItemStatus {
  Draft = 'draft',
  Active = 'active',
  OnHold = 'on_hold',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum BoqHierarchyStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum BoqVersionType {
  Original = 'original',
  Revision = 'revision',
  Variation = 'variation',
  ChangeOrder = 'change_order',
}

export enum BoqVersionStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Active = 'active',
  Superseded = 'superseded',
  Rejected = 'rejected',
}



@Schema({
  collection: 'boq_versions',
  timestamps: true,
})
export class BoqVersion {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Sequential version number within the project (1, 2, 3…). */
  @Prop({ type: Number, required: true, min: 1 })
  versionNumber!: number;

  @Prop({
    type: String,
    enum: BoqVersionType,
    required: true,
    index: true,
  })
  versionType!: BoqVersionType;

  @Prop({ type: Date, required: true, index: true })
  effectiveDate!: Date;

  @Prop({ type: String, trim: true, required: true })
  reason!: string;

  /** Net planned-value impact vs based-on / previous active version. */
  @Prop({ type: Number, required: true, default: 0 })
  costImpact!: number;

  /** Schedule impact in days (positive = delay). */
  @Prop({ type: Number, required: true, default: 0 })
  timeImpact!: number;

  @Prop({ type: String, trim: true, default: null })
  approvalReference!: string | null;

  @Prop({
    type: String,
    enum: BoqVersionStatus,
    required: true,
    default: BoqVersionStatus.Draft,
    index: true,
  })
  status!: BoqVersionStatus;

  @Prop({ type: Types.ObjectId, ref: 'BoqVersion', default: null })
  basedOnVersionId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true, default: 0 })
  totalPlannedValue!: number;

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

  createdAt?: Date;
  updatedAt?: Date;
}

export const BoqVersionSchema = SchemaFactory.createForClass(BoqVersion);
export type BoqVersionDocument = HydratedDocument<BoqVersion>;
BoqVersionSchema.plugin(baseSchemaPlugin);
BoqVersionSchema.plugin(softDeletePlugin);
BoqVersionSchema.index(
  { projectId: 1, versionNumber: 1 },
  { unique: true, name: 'uniq_boq_version_number' },
);
BoqVersionSchema.index(
  { projectId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active', isDeleted: false },
    name: 'uniq_boq_one_active_version',
  },
);

@Schema({
  collection: 'boq_blocks',
  timestamps: true,
})
export class BoqBlock {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  blockCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, default: 0 })
  sortOrder!: number;

  @Prop({
    type: String,
    enum: BoqHierarchyStatus,
    default: BoqHierarchyStatus.Active,
  })
  status!: BoqHierarchyStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BoqBlockSchema = SchemaFactory.createForClass(BoqBlock);
BoqBlockSchema.plugin(baseSchemaPlugin);
BoqBlockSchema.plugin(softDeletePlugin);
BoqBlockSchema.index(
  { projectId: 1, blockCode: 1 },
  { unique: true, name: 'uniq_boq_block_code' },
);

@Schema({
  collection: 'boq_floors',
  timestamps: true,
})
export class BoqFloor {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqBlock', required: true, index: true })
  blockId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  floorCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, default: 0 })
  level!: number;

  @Prop({ type: Number, default: 0 })
  sortOrder!: number;

  @Prop({
    type: String,
    enum: BoqHierarchyStatus,
    default: BoqHierarchyStatus.Active,
  })
  status!: BoqHierarchyStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BoqFloorSchema = SchemaFactory.createForClass(BoqFloor);
BoqFloorSchema.plugin(baseSchemaPlugin);
BoqFloorSchema.plugin(softDeletePlugin);
BoqFloorSchema.index(
  { blockId: 1, floorCode: 1 },
  { unique: true, name: 'uniq_boq_floor_code' },
);

@Schema({
  collection: 'boq_work_categories',
  timestamps: true,
})
export class BoqWorkCategory {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqBlock', required: true, index: true })
  blockId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqFloor', required: true, index: true })
  floorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  categoryCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, default: 0 })
  sortOrder!: number;

  @Prop({
    type: String,
    enum: BoqHierarchyStatus,
    default: BoqHierarchyStatus.Active,
  })
  status!: BoqHierarchyStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BoqWorkCategorySchema =
  SchemaFactory.createForClass(BoqWorkCategory);
BoqWorkCategorySchema.plugin(baseSchemaPlugin);
BoqWorkCategorySchema.plugin(softDeletePlugin);
BoqWorkCategorySchema.index(
  { floorId: 1, categoryCode: 1 },
  { unique: true, name: 'uniq_boq_work_category_code' },
);

@Schema({ _id: true })
export class BoqMaterialCoefficient {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', default: null })
  materialId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  /** Quantity of material per 1 BOQ unit. */
  @Prop({ type: Number, required: true, min: 0 })
  coefficient!: number;

  @Prop({ type: String, enum: BoqUnit, default: null })
  unit!: BoqUnit | null;
}

export const BoqMaterialCoefficientSchema = SchemaFactory.createForClass(
  BoqMaterialCoefficient,
);

@Schema({
  collection: 'boq_items',
  timestamps: true,
})
export class BoqItem {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqVersion', required: true, index: true })
  versionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqBlock', required: true, index: true })
  blockId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqFloor', required: true, index: true })
  floorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'BoqWorkCategory',
    required: true,
    index: true,
  })
  workCategoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  boqCode!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  plannedQuantity!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  materialCost!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  labourCost!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  subcontractCost!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  otherCost!: number;

  /** Per-unit rate = sum of cost components. */
  @Prop({ type: Number, required: true, min: 0 })
  plannedRate!: number;

  /** plannedQuantity × plannedRate */
  @Prop({ type: Number, required: true, min: 0 })
  plannedValue!: number;

  @Prop({ type: Date, default: null })
  startDate!: Date | null;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ type: [BoqMaterialCoefficientSchema], default: [] })
  materialCoefficients!: BoqMaterialCoefficient[];

  @Prop({
    type: String,
    enum: BoqItemStatus,
    required: true,
    default: BoqItemStatus.Draft,
    index: true,
  })
  status!: BoqItemStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BoqItemSchema = SchemaFactory.createForClass(BoqItem);
BoqItemSchema.plugin(baseSchemaPlugin);
BoqItemSchema.plugin(softDeletePlugin);
BoqItemSchema.index(
  { versionId: 1, boqCode: 1 },
  { unique: true, name: 'uniq_boq_item_code_per_version' },
);
BoqItemSchema.index({ projectId: 1, versionId: 1, status: 1 });
BoqItemSchema.index({ workCategoryId: 1, status: 1 });
BoqItemSchema.index({
  boqCode: 'text',
  description: 'text',
});
