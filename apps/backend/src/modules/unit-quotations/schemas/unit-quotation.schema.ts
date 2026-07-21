import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { computeUnitQuotationTotals } from '../unit-quotations.calculation';

export type UnitQuotationDocument = HydratedDocument<UnitQuotation>;

export enum UnitQuotationStatus {
  Draft = 'draft',
  Issued = 'issued',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Expired = 'expired',
  Superseded = 'superseded',
  Converted = 'converted',
}

@Schema({ _id: false })
export class UnitQuotationPricing {
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  basePrice!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  plc!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  floorRise!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  carPark!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  clubHouse!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  corpusFund!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  registrationEstimate!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  gst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  stampDutyEstimate!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  offerAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  otherCharges!: number;
}

export const UnitQuotationPricingSchema =
  SchemaFactory.createForClass(UnitQuotationPricing);

@Schema({ _id: false })
export class UnitQuotationTotalsSchemaClass {
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxTotal!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  grandTotal!: number;
}

export const UnitQuotationTotalsSchema = SchemaFactory.createForClass(
  UnitQuotationTotalsSchemaClass,
);

@Schema({ _id: false })
export class UnitQuotationAttachment {
  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: Number, min: 0, default: 0 })
  sizeBytes!: number;

  @Prop({ type: Date, required: true })
  uploadedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;
}

export const UnitQuotationAttachmentSchema = SchemaFactory.createForClass(
  UnitQuotationAttachment,
);

@Schema({
  collection: 'unit_quotations',
  timestamps: true,
})
export class UnitQuotation {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  quotationNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead', default: null, index: true })
  leadId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Customer', default: null, index: true })
  customerId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  version!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'UnitQuotation',
    default: null,
    index: true,
  })
  rootQuotationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'UnitQuotation', default: null })
  revisedFromId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: UnitQuotationStatus,
    required: true,
    default: UnitQuotationStatus.Draft,
    index: true,
  })
  status!: UnitQuotationStatus;

  @Prop({ type: Date, default: null, index: true })
  validUntil!: Date | null;

  @Prop({ type: UnitQuotationPricingSchema, required: true })
  pricing!: UnitQuotationPricing;

  @Prop({ type: UnitQuotationTotalsSchema, required: true })
  totals!: UnitQuotationTotalsSchemaClass;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  terms!: string | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Date, default: null })
  issuedAt!: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt!: Date | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiredAt!: Date | null;

  @Prop({ type: Date, default: null })
  convertedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'Booking', default: null, index: true })
  convertedBookingId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Reservation',
    default: null,
    index: true,
  })
  convertedReservationId!: Types.ObjectId | null;

  @Prop({ type: [UnitQuotationAttachmentSchema], default: [] })
  attachments!: UnitQuotationAttachment[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const UnitQuotationSchema = SchemaFactory.createForClass(UnitQuotation);

UnitQuotationSchema.plugin(baseSchemaPlugin);
UnitQuotationSchema.plugin(softDeletePlugin);

UnitQuotationSchema.pre('save', function (next) {
  if (this.pricing) {
    this.totals = computeUnitQuotationTotals(this.pricing);
  }
  next();
});

UnitQuotationSchema.index({ projectId: 1, status: 1, createdAt: -1 });
UnitQuotationSchema.index({ projectId: 1, unitId: 1, status: 1 });
UnitQuotationSchema.index({ rootQuotationId: 1, version: -1 });
UnitQuotationSchema.index({ leadId: 1, status: 1 });
UnitQuotationSchema.index({ customerId: 1, status: 1 });
