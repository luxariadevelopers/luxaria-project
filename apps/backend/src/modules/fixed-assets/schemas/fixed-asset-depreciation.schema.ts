import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type FixedAssetDepreciationDocument =
  HydratedDocument<FixedAssetDepreciation>;

export enum FixedAssetDepreciationStatus {
  Draft = 'draft',
  Posted = 'posted',
  Reversed = 'reversed',
}

@Schema({
  collection: 'fixed_asset_depreciations',
  timestamps: true,
})
export class FixedAssetDepreciation {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  depreciationNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'FixedAsset',
    required: true,
    index: true,
  })
  assetId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 12, index: true })
  periodMonth!: number;

  @Prop({ type: Number, required: true, min: 1900, index: true })
  periodYear!: number;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: FixedAssetDepreciationStatus,
    required: true,
    default: FixedAssetDepreciationStatus.Draft,
    index: true,
  })
  status!: FixedAssetDepreciationStatus;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  /** Set when journal posting failed but depreciation was recorded. */
  @Prop({ type: String, trim: true, default: null })
  postingNote!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FixedAssetDepreciationSchema = SchemaFactory.createForClass(
  FixedAssetDepreciation,
);

FixedAssetDepreciationSchema.plugin(baseSchemaPlugin);
FixedAssetDepreciationSchema.plugin(softDeletePlugin);

FixedAssetDepreciationSchema.index(
  { assetId: 1, periodYear: 1, periodMonth: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
