import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type FixedAssetDocument = HydratedDocument<FixedAsset>;

export enum FixedAssetStatus {
  Draft = 'draft',
  Active = 'active',
  Disposed = 'disposed',
  WrittenOff = 'written_off',
}

export enum DepreciationMethod {
  StraightLine = 'straight_line',
  Wdv = 'wdv',
}

export enum FixedAssetCategory {
  PlantMachinery = 'plant_machinery',
  Vehicle = 'vehicle',
  Furniture = 'furniture',
  Computer = 'computer',
  Building = 'building',
  Land = 'land',
  Other = 'other',
}

@Schema({
  collection: 'fixed_assets',
  timestamps: true,
})
export class FixedAsset {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  assetNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: FixedAssetCategory,
    required: true,
    index: true,
  })
  category!: FixedAssetCategory;

  @Prop({ type: Date, required: true, index: true })
  capitalizationDate!: Date;

  @Prop({ type: Date, required: true })
  putToUseDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  grossBlock!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  salvageValue!: number;

  @Prop({ type: Number, required: true, min: 1 })
  usefulLifeMonths!: number;

  @Prop({
    type: String,
    enum: DepreciationMethod,
    required: true,
    default: DepreciationMethod.StraightLine,
  })
  depreciationMethod!: DepreciationMethod;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  depreciationRatePercent!: number | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  accumulatedDepreciation!: number;

  @Prop({ type: String, trim: true, default: null })
  location!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', default: null, index: true })
  vendorId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  purchaseReference!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Account', default: null })
  glAssetAccountId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Account', default: null })
  glAccumDepAccountId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Account', default: null })
  glDepExpenseAccountId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: FixedAssetStatus,
    required: true,
    default: FixedAssetStatus.Draft,
    index: true,
  })
  status!: FixedAssetStatus;

  @Prop({ type: Date, default: null })
  disposalDate!: Date | null;

  @Prop({ type: Number, min: 0, default: null })
  disposalAmount!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FixedAssetSchema = SchemaFactory.createForClass(FixedAsset);

FixedAssetSchema.plugin(baseSchemaPlugin);
FixedAssetSchema.plugin(softDeletePlugin);

FixedAssetSchema.index({ companyId: 1, status: 1, createdAt: -1 });
FixedAssetSchema.index({ companyId: 1, projectId: 1, category: 1 });
