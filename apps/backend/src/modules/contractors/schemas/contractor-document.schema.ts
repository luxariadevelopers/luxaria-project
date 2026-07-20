import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorFileDocument = HydratedDocument<ContractorFile>;

export enum ContractorDocumentCategory {
  General = 'general',
  Agreement = 'agreement',
  Pan = 'pan',
  Gst = 'gst',
  BankProof = 'bank_proof',
  LabourLicence = 'labour_licence',
  Insurance = 'insurance',
  CancelledCheque = 'cancelled_cheque',
  Other = 'other',
}

@Schema({
  collection: 'contractor_documents',
  timestamps: true,
})
export class ContractorFile {
  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

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
    enum: ContractorDocumentCategory,
    default: ContractorDocumentCategory.General,
  })
  category!: ContractorDocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const ContractorFileSchema = SchemaFactory.createForClass(ContractorFile);

ContractorFileSchema.plugin(baseSchemaPlugin);
ContractorFileSchema.plugin(softDeletePlugin);

ContractorFileSchema.index({ contractorId: 1, createdAt: -1 });
ContractorFileSchema.index({ contractorId: 1, category: 1 });
