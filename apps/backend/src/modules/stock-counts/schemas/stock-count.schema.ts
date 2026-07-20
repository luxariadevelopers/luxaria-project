import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type StockCountDocument = HydratedDocument<StockCount>;

export enum StockCountStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Reviewed = 'reviewed',
  Approved = 'approved',
  AdjustmentPosted = 'adjustment_posted',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class StockCountItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  /** On-hand system qty in base unit at count time (or refresh). */
  @Prop({ type: Number, required: true, min: 0 })
  systemQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  physicalQuantity!: number;

  /** physical − system (signed, base unit). */
  @Prop({ type: Number, required: true })
  difference!: number;

  @Prop({ type: String, trim: true, default: null })
  reason!: string | null;

  /** Document id / S3 document reference for evidence photo. */
  @Prop({ type: String, trim: true, default: null })
  photo!: string | null;

  @Prop({ type: Boolean, default: false })
  isLargeVariance!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  stockLedgerEntryId!: Types.ObjectId | null;
}

export const StockCountItemSchema = SchemaFactory.createForClass(StockCountItem);

@Schema({
  collection: 'stock_counts',
  timestamps: true,
})
export class StockCount {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  countNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  countDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  countedBy!: Types.ObjectId;

  /** Empty string = default / unspecified location (matches stock balances). */
  @Prop({ type: String, trim: true, default: '', index: true })
  location!: string;

  @Prop({ type: [StockCountItemSchema], default: [] })
  items!: StockCountItem[];

  @Prop({
    type: String,
    enum: StockCountStatus,
    required: true,
    default: StockCountStatus.Draft,
    index: true,
  })
  status!: StockCountStatus;

  @Prop({ type: Boolean, default: false })
  requiresDirectorApproval!: boolean;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  journalSkippedReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StockCountSchema = SchemaFactory.createForClass(StockCount);

StockCountSchema.plugin(baseSchemaPlugin);
StockCountSchema.plugin(softDeletePlugin);

StockCountSchema.index({ projectId: 1, countDate: -1 });
StockCountSchema.index({ projectId: 1, status: 1, createdAt: -1 });
StockCountSchema.index({ countNumber: 'text' });
