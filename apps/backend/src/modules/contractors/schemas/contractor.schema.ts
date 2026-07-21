import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorDocument = HydratedDocument<Contractor>;

export enum ContractorStatus {
  Draft = 'draft',
  PendingVerification = 'pending_verification',
  Active = 'active',
  /** Temporary hold — can reactivate. */
  Suspended = 'suspended',
  /** Blacklist — requires reactivation with reason. */
  Blocked = 'blocked',
  Inactive = 'inactive',
}

export enum ContractorVerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

export enum ContractorType {
  Labour = 'labour',
  Civil = 'civil',
  Electrical = 'electrical',
  Plumbing = 'plumbing',
  Finishing = 'finishing',
  Specialist = 'specialist',
  General = 'general',
  Other = 'other',
}

export enum ContractorStatusAction {
  Verify = 'verify',
  Reject = 'reject',
  Activate = 'activate',
  Suspend = 'suspend',
  Blacklist = 'blacklist',
  Reactivate = 'reactivate',
  Deactivate = 'deactivate',
}

@Schema({ _id: false })
export class ContractorContact {
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

export const ContractorContactSchema =
  SchemaFactory.createForClass(ContractorContact);

/** Named contact entry (multiple contacts on master). */
@Schema({ _id: false })
export class ContractorContactEntry {
  @Prop({ type: String, trim: true, default: 'Primary' })
  label!: string;

  @Prop({ type: Boolean, default: false })
  isPrimary!: boolean;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  alternatePhone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  contactPerson!: string | null;

  @Prop({ type: String, trim: true, default: null })
  designation!: string | null;
}

export const ContractorContactEntrySchema = SchemaFactory.createForClass(
  ContractorContactEntry,
);

@Schema({ _id: false })
export class ContractorAddress {
  @Prop({ type: String, trim: true, default: 'Registered' })
  label!: string;

  @Prop({ type: Boolean, default: false })
  isPrimary!: boolean;

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

export const ContractorAddressSchema =
  SchemaFactory.createForClass(ContractorAddress);

@Schema({ _id: false })
export class ContractorBankDetails {
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

export const ContractorBankDetailsSchema = SchemaFactory.createForClass(
  ContractorBankDetails,
);

@Schema({ _id: false })
export class ContractorLabourLicence {
  @Prop({ type: String, trim: true, default: null })
  licenceNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  issuedBy!: string | null;

  @Prop({ type: Date, default: null })
  validFrom!: Date | null;

  @Prop({ type: Date, default: null })
  validTo!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const ContractorLabourLicenceSchema = SchemaFactory.createForClass(
  ContractorLabourLicence,
);

@Schema({ _id: false })
export class ContractorInsurance {
  @Prop({ type: String, trim: true, default: null })
  policyNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  insurer!: string | null;

  @Prop({ type: String, trim: true, default: null })
  coverageType!: string | null;

  @Prop({ type: Date, default: null })
  validFrom!: Date | null;

  @Prop({ type: Date, default: null })
  validTo!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const ContractorInsuranceSchema =
  SchemaFactory.createForClass(ContractorInsurance);

@Schema({ _id: false })
export class ContractorStatusEvent {
  @Prop({ type: String, required: true })
  fromStatus!: string;

  @Prop({ type: String, required: true })
  toStatus!: string;

  @Prop({ type: String, enum: ContractorStatusAction, required: true })
  action!: ContractorStatusAction;

  @Prop({ type: String, trim: true, default: null })
  reason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  at!: Date;
}

export const ContractorStatusEventSchema = SchemaFactory.createForClass(
  ContractorStatusEvent,
);

@Schema({
  collection: 'contractors',
  timestamps: true,
})
export class Contractor {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  contractorCode!: string;

  @Prop({ required: true, trim: true })
  legalName!: string;

  @Prop({ type: String, trim: true, default: null })
  tradeName!: string | null;

  @Prop({
    type: String,
    enum: ContractorType,
    required: true,
    default: ContractorType.General,
    index: true,
  })
  contractorType!: ContractorType;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  gstin!: string | null;

  /** Legacy single contact (kept in sync with primary of `contacts`). */
  @Prop({ type: ContractorContactSchema, default: () => ({}) })
  contact!: ContractorContact;

  @Prop({ type: [ContractorContactEntrySchema], default: [] })
  contacts!: ContractorContactEntry[];

  @Prop({ type: [ContractorAddressSchema], default: [] })
  addresses!: ContractorAddress[];

  @Prop({ type: ContractorBankDetailsSchema, default: () => ({}) })
  bankDetails!: ContractorBankDetails;

  @Prop({ type: ContractorLabourLicenceSchema, default: () => ({}) })
  labourLicence!: ContractorLabourLicence;

  @Prop({ type: ContractorInsuranceSchema, default: () => ({}) })
  insurance!: ContractorInsurance;

  /** Trade / work categories (lowercase slug). */
  @Prop({ type: [String], default: [] })
  workCategories!: string[];

  @Prop({ type: Number, min: 0, max: 5, default: null })
  rating!: number | null;

  @Prop({
    type: String,
    enum: ContractorVerificationStatus,
    default: ContractorVerificationStatus.Pending,
    index: true,
  })
  verificationStatus!: ContractorVerificationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  verificationNotes!: string | null;

  @Prop({
    type: String,
    enum: ContractorStatus,
    default: ContractorStatus.Draft,
    index: true,
  })
  status!: ContractorStatus;

  /** Reason for current block / suspend (cleared on reactivate). */
  @Prop({ type: String, trim: true, default: null })
  blockReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  statusReason!: string | null;

  @Prop({ type: [ContractorStatusEventSchema], default: [] })
  statusEvents!: ContractorStatusEvent[];

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorSchema = SchemaFactory.createForClass(Contractor);

ContractorSchema.plugin(baseSchemaPlugin);
ContractorSchema.plugin(softDeletePlugin);

ContractorSchema.index({
  legalName: 'text',
  tradeName: 'text',
  contractorCode: 'text',
  pan: 'text',
  gstin: 'text',
});
ContractorSchema.index({ status: 1, verificationStatus: 1 });
ContractorSchema.index({ contractorType: 1, status: 1 });
ContractorSchema.index({ workCategories: 1 });
ContractorSchema.index({ 'labourLicence.validTo': 1 });
ContractorSchema.index({ 'insurance.validTo': 1 });
ContractorSchema.index(
  { pan: 1 },
  {
    name: 'contractor_pan_unique_active',
    unique: true,
    partialFilterExpression: { pan: { $type: 'string' }, isDeleted: false },
  },
);
ContractorSchema.index(
  { gstin: 1 },
  {
    name: 'contractor_gstin_unique_active',
    unique: true,
    partialFilterExpression: { gstin: { $type: 'string' }, isDeleted: false },
  },
);
