import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { ProcurementMasterStatus } from './procurement-master-status';

export type PreferredVendorDocument = HydratedDocument<PreferredVendor>;

@Schema({
  collection: 'preferred_vendors',
  timestamps: true,
})
export class PreferredVendor {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', default: null, index: true })
  materialId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  materialCategoryCode!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  priority!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({
    type: String,
    enum: ProcurementMasterStatus,
    default: ProcurementMasterStatus.Active,
    index: true,
  })
  status!: ProcurementMasterStatus;
}

export const PreferredVendorSchema =
  SchemaFactory.createForClass(PreferredVendor);

PreferredVendorSchema.plugin(baseSchemaPlugin);
PreferredVendorSchema.plugin(softDeletePlugin);

PreferredVendorSchema.index({ companyId: 1, vendorId: 1, status: 1 });
PreferredVendorSchema.index({ companyId: 1, materialId: 1, priority: 1 });
