import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type AccountDocument = HydratedDocument<Account>;

export enum AccountType {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Income = 'income',
  Expense = 'expense',
}

export enum AccountCategory {
  Bank = 'bank',
  Cash = 'cash',
  PettyCash = 'petty_cash',
  DirectorAccount = 'director_account',
  InvestorAccount = 'investor_account',
  CustomerAdvance = 'customer_advance',
  VendorPayable = 'vendor_payable',
  ContractorPayable = 'contractor_payable',
  LabourPayable = 'labour_payable',
  MaterialPurchase = 'material_purchase',
  WorkInProgress = 'work_in_progress',
  LandCost = 'land_cost',
  DirectExpense = 'direct_expense',
  IndirectExpense = 'indirect_expense',
  InputGst = 'input_gst',
  OutputGst = 'output_gst',
  TdsPayable = 'tds_payable',
  RetentionPayable = 'retention_payable',
  Loan = 'loan',
  Interest = 'interest',
  Sales = 'sales',
  OtherIncome = 'other_income',
  /** Structural / header nodes without a specialist category */
  Control = 'control',
}

export enum AccountStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'accounts',
  timestamps: true,
})
export class Account {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  accountCode!: string;

  @Prop({ required: true, trim: true })
  accountName!: string;

  @Prop({ type: String, enum: AccountType, required: true, index: true })
  accountType!: AccountType;

  @Prop({ type: String, enum: AccountCategory, required: true, index: true })
  accountCategory!: AccountCategory;

  @Prop({ type: Types.ObjectId, ref: 'Account', default: null, index: true })
  parentAccountId!: Types.ObjectId | null;

  /** Root accounts are level 1 */
  @Prop({ type: Number, required: true, min: 1, default: 1, index: true })
  level!: number;

  @Prop({ type: Boolean, default: false })
  isControlAccount!: boolean;

  /**
   * When false, journals/vouchers must not post manually to this account.
   * Control accounts default to false unless explicitly configured.
   */
  @Prop({ type: Boolean, default: true })
  allowManualPosting!: boolean;

  @Prop({ type: Boolean, default: false })
  requiresProject!: boolean;

  @Prop({ type: Boolean, default: false })
  requiresParty!: boolean;

  @Prop({
    type: String,
    enum: AccountStatus,
    default: AccountStatus.Active,
    index: true,
  })
  status!: AccountStatus;

  /**
   * Incremented by the journal module when lines post.
   * Accounts with postingCount > 0 cannot be deleted.
   */
  @Prop({ type: Number, default: 0, min: 0 })
  postingCount!: number;

  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.plugin(baseSchemaPlugin);
AccountSchema.plugin(softDeletePlugin);

AccountSchema.index({ parentAccountId: 1, accountCode: 1 });
AccountSchema.index({ accountType: 1, status: 1 });
