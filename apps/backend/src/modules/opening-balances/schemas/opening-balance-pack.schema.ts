import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { JournalPartyType } from '../../journal/schemas/journal-entry.schema';

export type OpeningBalancePackDocument = HydratedDocument<OpeningBalancePack>;

export enum OpeningBalancePackStatus {
  Draft = 'draft',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({ _id: false })
export class OpeningBalanceLine {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  accountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  debit!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  credit!: number;

  @Prop({ type: Types.ObjectId, ref: 'CostCentre', default: null })
  costCentreId!: Types.ObjectId | null;

  @Prop({ type: String, enum: JournalPartyType, default: null })
  partyType!: JournalPartyType | null;

  @Prop({ type: Types.ObjectId, default: null })
  partyId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;
}

export const OpeningBalanceLineSchema =
  SchemaFactory.createForClass(OpeningBalanceLine);

@Schema({
  collection: 'opening_balance_packs',
  timestamps: true,
})
export class OpeningBalancePack {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  packNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'FinancialYear',
    required: true,
    index: true,
  })
  financialYearId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: OpeningBalancePackStatus,
    default: OpeningBalancePackStatus.Draft,
    index: true,
  })
  status!: OpeningBalancePackStatus;

  @Prop({ type: [OpeningBalanceLineSchema], default: [] })
  lines!: OpeningBalanceLine[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalDebit!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalCredit!: number;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null, index: true })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;
}

export const OpeningBalancePackSchema =
  SchemaFactory.createForClass(OpeningBalancePack);

OpeningBalancePackSchema.plugin(baseSchemaPlugin);
OpeningBalancePackSchema.plugin(softDeletePlugin);

OpeningBalancePackSchema.index({
  companyId: 1,
  financialYearId: 1,
  status: 1,
});
OpeningBalancePackSchema.index(
  { companyId: 1, financialYearId: 1 },
  {
    name: 'one_posted_opening_balance_per_fy',
    unique: true,
    partialFilterExpression: {
      status: OpeningBalancePackStatus.Posted,
      isDeleted: false,
    },
  },
);
