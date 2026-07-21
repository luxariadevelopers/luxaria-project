import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerDocument = HydratedDocument<Customer>;

export enum CustomerFundingType {
  OwnFunds = 'own_funds',
  BankLoan = 'bank_loan',
  Mixed = 'mixed',
}

export enum CustomerType {
  Individual = 'individual',
  JointOwner = 'joint_owner',
  Company = 'company',
  Nri = 'nri',
  Trust = 'trust',
}

export enum CustomerStatus {
  Draft = 'draft',
  PendingKyc = 'pending_kyc',
  Active = 'active',
  Inactive = 'inactive',
}

export enum CustomerKycStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Schema({ _id: false })
export class CustomerContact {
  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  alternatePhone!: string | null;
}

export const CustomerContactSchema = SchemaFactory.createForClass(CustomerContact);

@Schema({ _id: false })
export class CustomerAddress {
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

export const CustomerAddressSchema = SchemaFactory.createForClass(CustomerAddress);

/**
 * Joint applicant — Aadhaar encrypted at rest; only last-4 reference is selectable by default.
 */
@Schema({ _id: false })
export class CustomerJointApplicant {
  @Prop({ type: String, trim: true, default: null })
  fullName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  relationship!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  /** Last 4 digits of Aadhaar for display / search (non-secret) */
  @Prop({ type: String, trim: true, default: null })
  aadhaarReference!: string | null;

  /** AES-256-GCM encrypted full Aadhaar (`enc:v1:...`) */
  @Prop({ type: String, default: null, select: false })
  aadhaarEncrypted!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;
}

export const CustomerJointApplicantSchema =
  SchemaFactory.createForClass(CustomerJointApplicant);

@Schema({ _id: false })
export class CustomerBankDetails {
  @Prop({ type: String, trim: true, default: null })
  accountHolderName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  bankName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountNumber!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  ifsc!: string | null;

  @Prop({ type: String, trim: true, default: null })
  branch!: string | null;
}

export const CustomerBankDetailsSchema =
  SchemaFactory.createForClass(CustomerBankDetails);

@Schema({ _id: false })
export class CustomerNominee {
  @Prop({ type: String, trim: true, default: null })
  fullName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  relationship!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  address!: string | null;
}

export const CustomerNomineeSchema =
  SchemaFactory.createForClass(CustomerNominee);

@Schema({ _id: false })
export class CustomerCommunicationPreferences {
  @Prop({ type: Boolean, default: true })
  email!: boolean;

  @Prop({ type: Boolean, default: true })
  sms!: boolean;

  @Prop({ type: Boolean, default: false })
  whatsapp!: boolean;

  @Prop({ type: Boolean, default: false })
  postal!: boolean;
}

export const CustomerCommunicationPreferencesSchema =
  SchemaFactory.createForClass(CustomerCommunicationPreferences);

@Schema({
  collection: 'customers',
  timestamps: true,
})
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  customerCode!: string;

  @Prop({
    type: String,
    enum: CustomerType,
    required: true,
    default: CustomerType.Individual,
    index: true,
  })
  customerType!: CustomerType;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ type: CustomerJointApplicantSchema, default: () => ({}) })
  jointApplicant!: CustomerJointApplicant;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  /** Last 4 digits of Aadhaar for display / search (non-secret) */
  @Prop({ type: String, trim: true, default: null })
  aadhaarReference!: string | null;

  /** AES-256-GCM encrypted full Aadhaar (`enc:v1:...`) */
  @Prop({ type: String, default: null, select: false })
  aadhaarEncrypted!: string | null;

  /** Passport number for NRI customers */
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  passportNumber!: string | null;

  /** GSTIN when customerType is company / trust */
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  gstin!: string | null;

  @Prop({ type: CustomerContactSchema, default: () => ({}) })
  contact!: CustomerContact;

  /** Additional contact persons beyond primary contact */
  @Prop({ type: [CustomerContactSchema], default: [] })
  additionalContacts!: CustomerContact[];

  @Prop({ type: CustomerAddressSchema, default: () => ({}) })
  address!: CustomerAddress;

  @Prop({ type: CustomerBankDetailsSchema, default: () => ({}) })
  bankDetails!: CustomerBankDetails;

  @Prop({ type: CustomerNomineeSchema, default: () => ({}) })
  nominee!: CustomerNominee;

  @Prop({
    type: CustomerCommunicationPreferencesSchema,
    default: () => ({
      email: true,
      sms: true,
      whatsapp: false,
      postal: false,
    }),
  })
  communicationPreferences!: CustomerCommunicationPreferences;

  @Prop({ type: String, trim: true, default: null })
  occupation!: string | null;

  @Prop({
    type: String,
    enum: CustomerFundingType,
    required: true,
    index: true,
  })
  fundingType!: CustomerFundingType;

  /** Lending bank name — required when fundingType is bank_loan or mixed */
  @Prop({ type: String, trim: true, default: null })
  loanBank!: string | null;

  /** CRM lead that converted into this customer */
  @Prop({ type: Types.ObjectId, ref: 'Lead', default: null, index: true })
  sourceLeadId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: CustomerKycStatus,
    default: CustomerKycStatus.Pending,
    index: true,
  })
  kycStatus!: CustomerKycStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  kycVerifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  kycVerifiedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  kycNotes!: string | null;

  @Prop({
    type: String,
    enum: CustomerStatus,
    default: CustomerStatus.Draft,
    index: true,
  })
  status!: CustomerStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.plugin(baseSchemaPlugin);
CustomerSchema.plugin(softDeletePlugin);

CustomerSchema.index({ fullName: 'text', customerCode: 'text', pan: 'text' });
CustomerSchema.index({ status: 1, fundingType: 1 });
CustomerSchema.index({ aadhaarReference: 1 });
CustomerSchema.index(
  { pan: 1 },
  {
    name: 'customer_pan_unique_active',
    unique: true,
    partialFilterExpression: { pan: { $type: 'string' }, isDeleted: false },
  },
);
