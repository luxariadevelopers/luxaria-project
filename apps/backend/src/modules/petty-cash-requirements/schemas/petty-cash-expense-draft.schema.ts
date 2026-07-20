import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

/**
 * Lightweight draft expense claims against a petty-cash float.
 * Used to warn when old expenses are not yet submitted.
 * Full expense voucher module can supersede this later.
 */
export type PettyCashExpenseDraftDocument =
  HydratedDocument<PettyCashExpenseDraft>;

export enum PettyCashExpenseDraftStatus {
  Draft = 'draft',
  Submitted = 'submitted',
}

@Schema({
  collection: 'petty_cash_expense_drafts',
  timestamps: true,
})
export class PettyCashExpenseDraft {
  @Prop({
    type: Types.ObjectId,
    ref: 'CashAccount',
    required: true,
    index: true,
  })
  pettyCashAccountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  expenseDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({
    type: String,
    enum: PettyCashExpenseDraftStatus,
    default: PettyCashExpenseDraftStatus.Draft,
    index: true,
  })
  status!: PettyCashExpenseDraftStatus;
}

export const PettyCashExpenseDraftSchema = SchemaFactory.createForClass(
  PettyCashExpenseDraft,
);

PettyCashExpenseDraftSchema.plugin(baseSchemaPlugin);
PettyCashExpenseDraftSchema.plugin(softDeletePlugin);

PettyCashExpenseDraftSchema.index({
  pettyCashAccountId: 1,
  status: 1,
  expenseDate: 1,
});
