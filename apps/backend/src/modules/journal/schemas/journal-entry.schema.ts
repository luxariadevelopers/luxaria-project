import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type JournalEntryDocument = HydratedDocument<JournalEntry>;

export enum JournalStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Posted = 'posted',
  Reversed = 'reversed',
  Cancelled = 'cancelled',
}

export enum JournalPartyType {
  Vendor = 'vendor',
  Contractor = 'contractor',
  Customer = 'customer',
  Investor = 'investor',
  Director = 'director',
  Employee = 'employee',
  Other = 'other',
}

export enum JournalFundingSource {
  ProjectFunds = 'project_funds',
  CompanyFunds = 'company_funds',
  Loan = 'loan',
  Investor = 'investor',
  Director = 'director',
  Other = 'other',
}

@Schema({ _id: true })
export class JournalLine {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  accountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  debit!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  credit!: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  blockId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  costCentreId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  boqItemId!: Types.ObjectId | null;

  @Prop({ type: String, enum: JournalPartyType, default: null })
  partyType!: JournalPartyType | null;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  partyId!: Types.ObjectId | null;

  @Prop({ type: String, enum: JournalFundingSource, default: null })
  fundingSource!: JournalFundingSource | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;
}

export const JournalLineSchema = SchemaFactory.createForClass(JournalLine);

@Schema({
  collection: 'journal_entries',
  timestamps: true,
})
export class JournalEntry {
  @Prop({ required: true, unique: true, trim: true, index: true })
  journalNumber!: string;

  @Prop({ type: Date, required: true, index: true })
  journalDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'FinancialYear', required: true, index: true })
  financialYearId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null, index: true })
  sourceModule!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  sourceEntityType!: string | null;

  @Prop({ type: String, default: null, index: true })
  sourceEntityId!: string | null;

  @Prop({ type: String, trim: true, required: true })
  narration!: string;

  @Prop({
    type: String,
    enum: JournalStatus,
    default: JournalStatus.Draft,
    index: true,
  })
  status!: JournalStatus;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalDebit!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalCredit!: number;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  /** Original journal this entry reverses (set on the reversing entry) */
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null, index: true })
  reversalOf!: Types.ObjectId | null;

  /** Reversing journal created for this entry (set on the original when reversed) */
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  reversedBy!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: [JournalLineSchema], default: [] })
  lines!: JournalLine[];
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

JournalEntrySchema.plugin(baseSchemaPlugin);
JournalEntrySchema.plugin(softDeletePlugin);

JournalEntrySchema.index({ status: 1, journalDate: -1 });
JournalEntrySchema.index({ financialYearId: 1, status: 1 });
JournalEntrySchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
JournalEntrySchema.index({
  sourceModule: 1,
  sourceEntityType: 1,
  sourceEntityId: 1,
});
