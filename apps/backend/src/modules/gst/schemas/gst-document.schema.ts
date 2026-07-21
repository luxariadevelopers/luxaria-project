import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type GstDocumentDocument = HydratedDocument<GstDocument>;

export enum GstDocumentType {
  TaxInvoice = 'tax_invoice',
  DebitNote = 'debit_note',
  CreditNote = 'credit_note',
  BillOfSupply = 'bill_of_supply',
  SelfInvoice = 'self_invoice',
}

export enum GstDirection {
  Inward = 'inward',
  Outward = 'outward',
}

export enum GstPartyType {
  Vendor = 'vendor',
  Contractor = 'contractor',
  Customer = 'customer',
  Other = 'other',
}

export enum GstSupplyType {
  Intra = 'intra',
  Inter = 'inter',
}

export enum GstDocumentStatus {
  Draft = 'draft',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'gst_documents',
  timestamps: true,
})
export class GstDocument {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  documentNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, enum: GstDocumentType, required: true, index: true })
  documentType!: GstDocumentType;

  @Prop({ type: String, enum: GstDirection, required: true, index: true })
  direction!: GstDirection;

  @Prop({ type: String, enum: GstPartyType, required: true, index: true })
  partyType!: GstPartyType;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  partyId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  partyGstin!: string | null;

  @Prop({ type: String, trim: true, required: true })
  partyName!: string;

  @Prop({ type: Date, required: true, index: true })
  documentDate!: Date;

  @Prop({ type: String, enum: GstSupplyType, required: true })
  supplyType!: GstSupplyType;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxableValue!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cgst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sgst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  igst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cess!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalValue!: number;

  @Prop({ type: String, trim: true, default: null })
  hsnSac!: string | null;

  @Prop({ type: String, trim: true, default: null })
  placeOfSupply!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  sourceModule!: string | null;

  @Prop({ type: String, trim: true, default: null })
  sourceEntityType!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  sourceEntityId!: string | null;

  @Prop({
    type: String,
    enum: GstDocumentStatus,
    required: true,
    default: GstDocumentStatus.Draft,
    index: true,
  })
  status!: GstDocumentStatus;

  @Prop({ type: Types.ObjectId, ref: 'Journal', default: null, index: true })
  journalEntryId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GstDocumentSchema = SchemaFactory.createForClass(GstDocument);

GstDocumentSchema.plugin(baseSchemaPlugin);
GstDocumentSchema.plugin(softDeletePlugin);

GstDocumentSchema.index({ companyId: 1, documentDate: -1, status: 1 });
GstDocumentSchema.index({ companyId: 1, direction: 1, documentDate: -1 });
GstDocumentSchema.index(
  { sourceModule: 1, sourceEntityId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceModule: { $type: 'string' },
      sourceEntityId: { $type: 'string' },
    },
  },
);
