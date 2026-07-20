import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CompanyBankAccountDocument = HydratedDocument<CompanyBankAccount>;

export enum BankAccountType {
  Current = 'current',
  Savings = 'savings',
  Overdraft = 'overdraft',
  CashCredit = 'cash_credit',
  Escrow = 'escrow',
  Other = 'other',
}

export enum BankAccountStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'company_bank_accounts',
  timestamps: true,
})
export class CompanyBankAccount {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  accountCode!: string;

  @Prop({ required: true, trim: true })
  bankName!: string;

  @Prop({ type: String, trim: true, default: null })
  branch!: string | null;

  @Prop({ required: true, trim: true })
  accountHolderName!: string;

  /** Safe display form, e.g. XXXXXX9012 — never the full number */
  @Prop({ required: true, trim: true })
  maskedAccountNumber!: string;

  /** AES-GCM ciphertext — excluded from queries by default */
  @Prop({ type: String, required: true, select: false })
  encryptedAccountNumber!: string;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  ifsc!: string;

  @Prop({
    type: String,
    enum: BankAccountType,
    required: true,
    index: true,
  })
  accountType!: BankAccountType;

  /** Null = company-level account; set for project-specific accounts */
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  /** Linked COA bank ledger account */
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  ledgerAccountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 0 })
  openingBalance!: number;

  @Prop({
    type: String,
    enum: BankAccountStatus,
    default: BankAccountStatus.Active,
    index: true,
  })
  status!: BankAccountStatus;

  /**
   * At most one default bank account per projectId
   * (and one company-wide default when projectId is null).
   */
  @Prop({ type: Boolean, default: false, index: true })
  isDefault!: boolean;
}

export const CompanyBankAccountSchema =
  SchemaFactory.createForClass(CompanyBankAccount);

CompanyBankAccountSchema.plugin(baseSchemaPlugin);
CompanyBankAccountSchema.plugin(softDeletePlugin);

CompanyBankAccountSchema.index(
  { projectId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDefault: true,
      isDeleted: false,
    },
  },
);

CompanyBankAccountSchema.index({ ifsc: 1, maskedAccountNumber: 1 });
