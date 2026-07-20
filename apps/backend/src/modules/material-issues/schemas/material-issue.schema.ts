import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type MaterialIssueDocument = HydratedDocument<MaterialIssue>;

export enum MaterialIssueStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

@Schema({ _id: false })
export class MaterialIssueSignatures {
  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  recipientSignatureDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  recipientSignatureChecksum!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  issuerSignatureDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  issuerSignatureChecksum!: string | null;

  @Prop({ type: Date, default: null })
  recipientSignedAt!: Date | null;
}

export const MaterialIssueSignaturesSchema = SchemaFactory.createForClass(
  MaterialIssueSignatures,
);

@Schema({ _id: true })
export class MaterialIssueItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  baseUnitQuantity!: number;

  /** Cumulative quantity returned in base unit. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  returnedBaseQuantity!: number;

  @Prop({ type: String, trim: true, default: null })
  batch!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  stockLedgerEntryId!: Types.ObjectId | null;
}

export const MaterialIssueItemSchema =
  SchemaFactory.createForClass(MaterialIssueItem);

@Schema({ _id: true })
export class MaterialReturnItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  baseUnitQuantity!: number;

  @Prop({ type: String, trim: true, default: null })
  reason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  stockLedgerEntryId!: Types.ObjectId | null;
}

export const MaterialReturnItemSchema =
  SchemaFactory.createForClass(MaterialReturnItem);

@Schema({ _id: true })
export class MaterialIssueReturn {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  returnNumber!: string;

  @Prop({ type: Date, required: true })
  returnDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  returnedBy!: Types.ObjectId;

  @Prop({ type: [MaterialReturnItemSchema], default: [] })
  items!: MaterialReturnItem[];

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;
}

export const MaterialIssueReturnSchema =
  SchemaFactory.createForClass(MaterialIssueReturn);

@Schema({
  collection: 'material_issues',
  timestamps: true,
})
export class MaterialIssue {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  issueNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  issueDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  issuedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receivedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  contractorId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  blockId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  floorId!: string | null;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  workLocation!: string;

  /** Store / yard location used for stock balance (matches ledger location). */
  @Prop({ type: String, trim: true, default: '', index: true })
  storeLocation!: string;

  @Prop({ type: [MaterialIssueItemSchema], default: [] })
  items!: MaterialIssueItem[];

  @Prop({ type: MaterialIssueSignaturesSchema, default: () => ({}) })
  signatures!: MaterialIssueSignatures;

  @Prop({
    type: String,
    enum: MaterialIssueStatus,
    required: true,
    default: MaterialIssueStatus.Draft,
    index: true,
  })
  status!: MaterialIssueStatus;

  @Prop({ type: [MaterialIssueReturnSchema], default: [] })
  returns!: MaterialIssueReturn[];

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  confirmedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MaterialIssueSchema = SchemaFactory.createForClass(MaterialIssue);

MaterialIssueSchema.plugin(baseSchemaPlugin);
MaterialIssueSchema.plugin(softDeletePlugin);

MaterialIssueSchema.index({ projectId: 1, issueDate: -1 });
MaterialIssueSchema.index({ projectId: 1, status: 1, createdAt: -1 });
MaterialIssueSchema.index({ issueNumber: 'text', workLocation: 'text' });
