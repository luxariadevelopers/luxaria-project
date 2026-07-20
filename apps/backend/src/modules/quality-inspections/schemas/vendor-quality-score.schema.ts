import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type VendorQualityScoreDocument = HydratedDocument<VendorQualityScore>;

/**
 * Aggregated vendor quality score derived from completed inspections.
 * Score is 0–100 (higher is better).
 */
@Schema({
  collection: 'vendor_quality_scores',
  timestamps: true,
})
export class VendorQualityScore {
  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
    unique: true,
    index: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  inspectionsCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  acceptedCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  partiallyAcceptedCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  rejectedCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  holdCount!: number;

  /** Weighted score 0–100. */
  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  score!: number;

  /** 0–5 star-equivalent for quotation comparison reuse. */
  @Prop({ type: Number, required: true, min: 0, max: 5, default: 0 })
  ratingEquivalent!: number;

  @Prop({ type: Date, default: null })
  lastInspectionAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'QualityInspection', default: null })
  lastInspectionId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorQualityScoreSchema =
  SchemaFactory.createForClass(VendorQualityScore);

VendorQualityScoreSchema.plugin(baseSchemaPlugin);
VendorQualityScoreSchema.plugin(softDeletePlugin);
