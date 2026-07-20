import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type VendorFileDocument = HydratedDocument<VendorFile>;

export enum VendorDocumentCategory {
  General = 'general',
  Agreement = 'agreement',
  Pan = 'pan',
  Gst = 'gst',
  BankProof = 'bank_proof',
  Msme = 'msme',
  CancelledCheque = 'cancelled_cheque',
  Other = 'other',
}

@Schema({
  collection: 'vendor_documents',
  timestamps: true,
})
export class VendorFile {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  sizeBytes!: number;

  @Prop({
    type: String,
    enum: VendorDocumentCategory,
    default: VendorDocumentCategory.General,
  })
  category!: VendorDocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const VendorFileSchema = SchemaFactory.createForClass(VendorFile);

VendorFileSchema.plugin(baseSchemaPlugin);
VendorFileSchema.plugin(softDeletePlugin);

VendorFileSchema.index({ vendorId: 1, createdAt: -1 });
VendorFileSchema.index({ vendorId: 1, category: 1 });
