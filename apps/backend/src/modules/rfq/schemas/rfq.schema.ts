import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type RfqDocument = HydratedDocument<Rfq>;

export enum RfqStatus {
  Draft = 'draft',
  Issued = 'issued',
  Closed = 'closed',
  Cancelled = 'cancelled',
  Awarded = 'awarded',
}

@Schema({
  collection: 'rfqs',
  timestamps: true,
})
export class Rfq {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseRequest',
    required: true,
    index: true,
  })
  purchaseRequestId!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  rfqNumber!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({
    type: String,
    enum: RfqStatus,
    default: RfqStatus.Draft,
    index: true,
  })
  status!: RfqStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Vendor' }], default: [] })
  vendorIds!: Types.ObjectId[];

  @Prop({ type: Date, required: true, index: true })
  closingDate!: Date;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Date, default: null })
  issuedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  issuedBy!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RfqSchema = SchemaFactory.createForClass(Rfq);

RfqSchema.plugin(baseSchemaPlugin);
RfqSchema.plugin(softDeletePlugin);

RfqSchema.index({ projectId: 1, status: 1, createdAt: -1 });
RfqSchema.index({ purchaseRequestId: 1, createdAt: -1 });
RfqSchema.index({ vendorIds: 1, status: 1 });
