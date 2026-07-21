import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type TdsSectionDocument = HydratedDocument<TdsSection>;

export enum TdsSectionStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'tds_sections',
  timestamps: true,
})
export class TdsSection {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  sectionCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  ratePercent!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  thresholdAmount!: number;

  @Prop({
    type: String,
    enum: TdsSectionStatus,
    required: true,
    default: TdsSectionStatus.Active,
    index: true,
  })
  status!: TdsSectionStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TdsSectionSchema = SchemaFactory.createForClass(TdsSection);

TdsSectionSchema.plugin(baseSchemaPlugin);
TdsSectionSchema.plugin(softDeletePlugin);
