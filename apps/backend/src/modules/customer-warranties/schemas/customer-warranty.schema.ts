import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerWarrantyDocument = HydratedDocument<CustomerWarranty>;

export enum WarrantyCategory {
  Waterproofing = 'waterproofing',
  Electrical = 'electrical',
  Plumbing = 'plumbing',
  Finishing = 'finishing',
  Other = 'other',
}

export enum WarrantyStatus {
  Complaint = 'complaint',
  Inspection = 'inspection',
  Assigned = 'assigned',
  Rectified = 'rectified',
  Verified = 'verified',
  Closed = 'closed',
  Rejected = 'rejected',
}

@Schema({ _id: true })
export class MaterialUsageItem {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  materialName!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, trim: true, default: null })
  unit!: string | null;
}

export const MaterialUsageItemSchema =
  SchemaFactory.createForClass(MaterialUsageItem);

@Schema({ _id: true })
export class CompletionPhoto {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  caption!: string | null;
}

export const CompletionPhotoSchema =
  SchemaFactory.createForClass(CompletionPhoto);

@Schema({
  collection: 'customer_warranties',
  timestamps: true,
})
export class CustomerWarranty {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  ticketNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'UnitHandover',
    default: null,
    index: true,
  })
  handoverId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: WarrantyCategory,
    required: true,
    index: true,
  })
  category!: WarrantyCategory;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: Date, default: null, index: true })
  slaDueAt!: Date | null;

  @Prop({
    type: String,
    enum: WarrantyStatus,
    required: true,
    default: WarrantyStatus.Complaint,
    index: true,
  })
  status!: WarrantyStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    default: null,
    index: true,
  })
  assignedContractorId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  assignedUserId!: Types.ObjectId | null;

  @Prop({ type: [MaterialUsageItemSchema], default: [] })
  materialUsage!: MaterialUsageItem[];

  @Prop({ type: [CompletionPhotoSchema], default: [] })
  completionPhotos!: CompletionPhoto[];

  @Prop({ type: String, trim: true, default: null })
  inspectionNotes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  rectificationNotes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  verificationNotes!: string | null;

  @Prop({ type: Date, required: true, default: () => new Date(), index: true })
  raisedAt!: Date;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerWarrantySchema =
  SchemaFactory.createForClass(CustomerWarranty);

CustomerWarrantySchema.plugin(baseSchemaPlugin);
CustomerWarrantySchema.plugin(softDeletePlugin);

CustomerWarrantySchema.index({ projectId: 1, status: 1, createdAt: -1 });
CustomerWarrantySchema.index({ customerId: 1, status: 1 });
CustomerWarrantySchema.index({ unitId: 1, status: 1 });
CustomerWarrantySchema.index({ slaDueAt: 1, status: 1 });
