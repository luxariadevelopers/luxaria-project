import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type InvestorFileDocument = HydratedDocument<InvestorFile>;

export enum InvestorDocumentCategory {
  General = 'general',
  Pan = 'pan',
  Aadhaar = 'aadhaar',
  Gst = 'gst',
  Cin = 'cin',
  BankProof = 'bank_proof',
  Kyc = 'kyc',
  Nominee = 'nominee',
  Other = 'other',
}

@Schema({
  collection: 'investor_documents',
  timestamps: true,
})
export class InvestorFile {
  @Prop({ type: Types.ObjectId, ref: 'Investor', required: true, index: true })
  investorId!: Types.ObjectId;

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
    enum: InvestorDocumentCategory,
    default: InvestorDocumentCategory.General,
  })
  category!: InvestorDocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const InvestorFileSchema = SchemaFactory.createForClass(InvestorFile);

InvestorFileSchema.plugin(baseSchemaPlugin);
InvestorFileSchema.plugin(softDeletePlugin);

InvestorFileSchema.index({ investorId: 1, createdAt: -1 });
