import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

export enum ExpenseCategoryStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'expense_categories',
  timestamps: true,
})
export class ExpenseCategory {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  categoryCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'ExpenseCategory',
    default: null,
    index: true,
  })
  parentCategoryId!: Types.ObjectId | null;

  /** Root categories are level 1 */
  @Prop({ type: Number, required: true, min: 1, default: 1, index: true })
  level!: number;

  /** Default COA expense account for postings in this category */
  @Prop({ type: Types.ObjectId, ref: 'Account', default: null, index: true })
  defaultLedgerAccountId!: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  requiresBill!: boolean;

  @Prop({ type: Boolean, default: false })
  requiresSignature!: boolean;

  @Prop({ type: Boolean, default: false })
  requiresPhoto!: boolean;

  /**
   * Amount above which an approval step is required.
   * Null = no category-level approval limit configured.
   */
  @Prop({ type: Number, default: null, min: 0 })
  approvalLimit!: number | null;

  @Prop({
    type: String,
    enum: ExpenseCategoryStatus,
    default: ExpenseCategoryStatus.Active,
    index: true,
  })
  status!: ExpenseCategoryStatus;

  /** Seeded / system categories cannot be deleted */
  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

ExpenseCategorySchema.plugin(baseSchemaPlugin);
ExpenseCategorySchema.plugin(softDeletePlugin);

ExpenseCategorySchema.index({ parentCategoryId: 1, categoryCode: 1 });
ExpenseCategorySchema.index({ status: 1, name: 1 });
