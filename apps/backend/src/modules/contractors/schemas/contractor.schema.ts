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

  @Prop({ type: ContractorContactSchema, default: () => ({}) })
  contact!: ContractorContact;

  @Prop({ type: ContractorBankDetailsSchema, default: () => ({}) })
  bankDetails!: ContractorBankDetails;

  @Prop({ type: ContractorLabourLicenceSchema, default: () => ({}) })
  labourLicence!: ContractorLabourLicence;

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

  @Prop({ type: String, trim: true, default: null })
  blockReason!: string | null;

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
