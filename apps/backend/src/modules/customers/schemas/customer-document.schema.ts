import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerFileDocument = HydratedDocument<CustomerFile>;

export enum CustomerDocumentCategory {
  General = 'general',
  Pan = 'pan',
  Aadhaar = 'aadhaar',
  Photo = 'photo',
  AddressProof = 'address_proof',
  IncomeProof = 'income_proof',
  BankStatement = 'bank_statement',
  LoanSanction = 'loan_sanction',
  Kyc = 'kyc',
  Other = 'other',
}

/** Categories that contain PII / identity proof — download gated to customer.manage */
export const SENSITIVE_CUSTOMER_DOCUMENT_CATEGORIES: ReadonlySet<CustomerDocumentCategory> =
  new Set([
    CustomerDocumentCategory.Pan,
    CustomerDocumentCategory.Aadhaar,
    CustomerDocumentCategory.Photo,
    CustomerDocumentCategory.AddressProof,
    CustomerDocumentCategory.IncomeProof,
    CustomerDocumentCategory.BankStatement,
    CustomerDocumentCategory.LoanSanction,
    CustomerDocumentCategory.Kyc,
  ]);

@Schema({
  collection: 'customer_documents',
  timestamps: true,
})
export class CustomerFile {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  /** Relative private storage key — never a public URL */
  @Prop({ required: true, trim: true, select: false })
  storageKey!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  sizeBytes!: number;

  @Prop({
    type: String,
    enum: CustomerDocumentCategory,
    default: CustomerDocumentCategory.General,
  })
  category!: CustomerDocumentCategory;

  @Prop({ type: Boolean, default: true, index: true })
  isSensitive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const CustomerFileSchema = SchemaFactory.createForClass(CustomerFile);

CustomerFileSchema.plugin(baseSchemaPlugin);
CustomerFileSchema.plugin(softDeletePlugin);

CustomerFileSchema.index({ customerId: 1, createdAt: -1 });
CustomerFileSchema.index({ customerId: 1, category: 1 });
