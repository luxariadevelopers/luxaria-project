import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type InvestorDocument = HydratedDocument<Investor>;

export enum InvestorType {
  Individual = 'individual',
  Company = 'company',
  Partnership = 'partnership',
  Trust = 'trust',
  /** Board director investing into a project (not company equity shareholding) */
  DirectorAsProjectInvestor = 'director_as_project_investor',
}

export enum InvestorStatus {
  Draft = 'draft',
  PendingKyc = 'pending_kyc',
  Active = 'active',
  Inactive = 'inactive',
}

export enum InvestorKycStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Schema({ _id: false })
export class InvestorContact {
  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  alternatePhone!: string | null;

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

export const InvestorContactSchema = SchemaFactory.createForClass(InvestorContact);

/**
 * Bank details — accountNumberEncrypted is AES-GCM ciphertext; never store plain account numbers.
 */
@Schema({ _id: false })
export class InvestorBankDetails {
  @Prop({ type: String, trim: true, default: null })
  bankName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  branchName!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  ifsc!: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountHolderName!: string | null;

  /** AES-256-GCM encrypted account number (`enc:v1:...`) */
  @Prop({ type: String, default: null, select: false })
  accountNumberEncrypted!: string | null;

  /** Last 4 digits for display / search (non-secret) */
  @Prop({ type: String, trim: true, default: null })
  accountNumberLast4!: string | null;
}

export const InvestorBankDetailsSchema =
  SchemaFactory.createForClass(InvestorBankDetails);

@Schema({ _id: false })
export class InvestorNominee {
  @Prop({ type: String, trim: true, default: null })
  fullName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  relationship!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  sharePercent!: number | null;
}

export const InvestorNomineeSchema = SchemaFactory.createForClass(InvestorNominee);

@Schema({
  collection: 'investors',
  timestamps: true,
})
export class Investor {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  investorCode!: string;

  @Prop({
    type: String,
    enum: InvestorType,
    required: true,
    index: true,
  })
  investorType!: InvestorType;

  @Prop({ required: true, trim: true })
  legalName!: string;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  gstin!: string | null;

  /** Required when investorType is company */
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  cin!: string | null;

  /** Linked system user (investor portal login) */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;

  /** When type is director_as_project_investor */
  @Prop({ type: Types.ObjectId, ref: 'Director', default: null, index: true })
  directorId!: Types.ObjectId | null;

  @Prop({ type: InvestorContactSchema, default: () => ({}) })
  contact!: InvestorContact;

  @Prop({ type: InvestorBankDetailsSchema, default: () => ({}) })
  bankDetails!: InvestorBankDetails;

  @Prop({ type: InvestorNomineeSchema, default: () => ({}) })
  nominee!: InvestorNominee;

  @Prop({
    type: String,
    enum: InvestorKycStatus,
    default: InvestorKycStatus.Pending,
    index: true,
  })
  kycStatus!: InvestorKycStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  kycVerifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  kycVerifiedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  kycNotes!: string | null;

  @Prop({
    type: String,
    enum: InvestorStatus,
    default: InvestorStatus.Draft,
    index: true,
  })
  status!: InvestorStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvestorSchema = SchemaFactory.createForClass(Investor);

InvestorSchema.plugin(baseSchemaPlugin);
InvestorSchema.plugin(softDeletePlugin);

InvestorSchema.index({ legalName: 'text', investorCode: 'text', pan: 'text' });
InvestorSchema.index({ status: 1, investorType: 1 });
InvestorSchema.index(
  { pan: 1 },
  {
    name: 'investor_pan_unique_active',
    unique: true,
    partialFilterExpression: { pan: { $type: 'string' }, isDeleted: false },
  },
);
