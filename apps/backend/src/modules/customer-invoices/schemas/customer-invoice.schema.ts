import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerInvoiceDocument = HydratedDocument<CustomerInvoice>;

export enum CustomerInvoiceStatus {
  Draft = 'draft',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class CustomerInvoiceLine {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  taxableAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;
}

export const CustomerInvoiceLineSchema =
  SchemaFactory.createForClass(CustomerInvoiceLine);

@Schema({
  collection: 'customer_invoices',
  timestamps: true,
})
export class CustomerInvoice {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  invoiceNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', default: null, index: true })
  unitId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true, index: true })
  invoiceDate!: Date;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({
    type: String,
    enum: CustomerInvoiceStatus,
    required: true,
    default: CustomerInvoiceStatus.Draft,
    index: true,
  })
  status!: CustomerInvoiceStatus;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxableAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cgst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sgst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  igst!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, trim: true, default: null })
  placeOfSupply!: string | null;

  @Prop({ type: String, trim: true, default: null })
  hsnSac!: string | null;

  @Prop({ type: [CustomerInvoiceLineSchema], default: [] })
  lines!: CustomerInvoiceLine[];

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'GstDocument', default: null })
  gstDocumentId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentDemand', default: null })
  demandId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentSchedule', default: null })
  paymentScheduleId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerInvoiceSchema =
  SchemaFactory.createForClass(CustomerInvoice);

CustomerInvoiceSchema.plugin(baseSchemaPlugin);
CustomerInvoiceSchema.plugin(softDeletePlugin);

CustomerInvoiceSchema.index({ projectId: 1, status: 1, invoiceDate: -1 });
CustomerInvoiceSchema.index({ bookingId: 1, status: 1 });
CustomerInvoiceSchema.index({ customerId: 1, invoiceDate: -1 });
