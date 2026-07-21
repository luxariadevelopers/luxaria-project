import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { ProcurementMasterStatus } from './procurement-master-status';

export type VendorPriceListDocument = HydratedDocument<VendorPriceList>;

@Schema({
  collection: 'vendor_price_lists',
  timestamps: true,
})
export class VendorPriceList {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: String, trim: true, uppercase: true, default: 'INR' })
  currency!: string;

  @Prop({ type: Types.ObjectId, ref: 'TaxRule', default: null })
  taxRuleId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  @Prop({ type: Date, default: null })
  effectiveTo!: Date | null;

  @Prop({
    type: String,
    enum: ProcurementMasterStatus,
    default: ProcurementMasterStatus.Active,
    index: true,
  })
  status!: ProcurementMasterStatus;
}

export const VendorPriceListSchema =
  SchemaFactory.createForClass(VendorPriceList);

VendorPriceListSchema.plugin(baseSchemaPlugin);
VendorPriceListSchema.plugin(softDeletePlugin);

VendorPriceListSchema.index({
  companyId: 1,
  vendorId: 1,
  materialId: 1,
  effectiveFrom: -1,
});
