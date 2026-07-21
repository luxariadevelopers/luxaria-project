import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type VendorDocument = HydratedDocument<Vendor>;

export enum VendorStatus {
  Draft = 'draft',
  PendingVerification = 'pending_verification',
  Active = 'active',
  Blocked = 'blocked',
  Inactive = 'inactive',
}

export enum VendorVerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Schema({ _id: false })
export class VendorContact {
  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  alternatePhone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  contactPerson!: string | null;

  @Prop({ type: String, trim: true, default: null })
  addressLine1!: string | null;

  @Prop({ type: String, trim: true, default: null })
  addressLine2!: string | null;

  @Prop({ type: String, trim: true, default: null })
  city!: string | null;

  @Prop({ type: String, trim: true, default: null })
  state!: string | null;

  @Prop({ type: String, trim: true, default: null })
  pincode!: string | null;

  @Prop({ type: String, trim: true, default: 'India' })
  country!: string | null;
}

export const VendorContactSchema = SchemaFactory.createForClass(VendorContact);

@Schema({ _id: false })
export class VendorBillingAddress {
  @Prop({ type: String, trim: true, default: null })
  line1!: string | null;

  @Prop({ type: String, trim: true, default: null })
  line2!: string | null;

  @Prop({ type: String, trim: true, default: null })
  city!: string | null;

  @Prop({ type: String, trim: true, default: null })
  state!: string | null;

  @Prop({ type: String, trim: true, default: null })
  pincode!: string | null;

  @Prop({ type: String, trim: true, default: 'India' })
  country!: string | null;
}

export const VendorBillingAddressSchema =
  SchemaFactory.createForClass(VendorBillingAddress);

@Schema({ _id: false })
export class VendorBankDetails {
  @Prop({ type: String, trim: true, default: null })
  bankName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  branchName!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  ifsc!: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountHolderName!: string | null;

  @Prop({ type: String, default: null, select: false })
  accountNumberEncrypted!: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountNumberLast4!: string | null;
}

export const VendorBankDetailsSchema =
  SchemaFactory.createForClass(VendorBankDetails);

@Schema({
  collection: 'vendors',
  timestamps: true,
})
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  /** Linked login user for vendor portal access. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  vendorCode!: string;

  @Prop({ required: true, trim: true })
  legalName!: string;

  @Prop({ type: String, trim: true, default: null })
  tradeName!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  gstin!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: VendorContactSchema, default: () => ({}) })
  contact!: VendorContact;

  @Prop({ type: VendorBillingAddressSchema, default: () => ({}) })
  billingAddress!: VendorBillingAddress;

  @Prop({ type: VendorBankDetailsSchema, default: () => ({}) })
  bankDetails!: VendorBankDetails;

  @Prop({
    type: [String],
    default: [],
  })
  materialCategories!: string[];

  @Prop({ type: String, trim: true, default: null })
  paymentTerms!: string | null;

  @Prop({ type: Number, min: 0, default: 0 })
  creditLimit!: number;

  @Prop({ type: Boolean, default: false })
  tdsApplicable!: boolean;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  tdsPercentage!: number | null;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  retentionPercentage!: number;

  @Prop({ type: Number, min: 0, max: 5, default: null })
  rating!: number | null;

  @Prop({
    type: String,
    enum: VendorVerificationStatus,
    default: VendorVerificationStatus.Pending,
    index: true,
  })
  verificationStatus!: VendorVerificationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  verificationNotes!: string | null;

  @Prop({
    type: String,
    enum: VendorStatus,
    default: VendorStatus.Draft,
    index: true,
  })
  status!: VendorStatus;

  @Prop({ type: String, trim: true, default: null })
  blockReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.plugin(baseSchemaPlugin);
VendorSchema.plugin(softDeletePlugin);

VendorSchema.index({
  legalName: 'text',
  tradeName: 'text',
  vendorCode: 'text',
  pan: 'text',
  gstin: 'text',
});
VendorSchema.index({ status: 1, verificationStatus: 1 });
VendorSchema.index({ materialCategories: 1 });
VendorSchema.index(
  { pan: 1 },
  {
    name: 'vendor_pan_unique_active',
    unique: true,
    partialFilterExpression: { pan: { $type: 'string' }, isDeleted: false },
  },
);
VendorSchema.index(
  { gstin: 1 },
  {
    name: 'vendor_gstin_unique_active',
    unique: true,
    partialFilterExpression: { gstin: { $type: 'string' }, isDeleted: false },
  },
);
