import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ShareholdingChangeRequestDocument =
  HydratedDocument<ShareholdingChangeRequest>;

export enum ShareholdingChangeStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Schema({ _id: false })
export class ProposedShareholdingLine {
  @Prop({ type: Types.ObjectId, ref: 'Director', required: true })
  directorId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  numberOfShares!: number;

  @Prop({ type: Number, required: true, min: 0 })
  faceValue!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percentage!: number;

  @Prop({ type: Types.ObjectId, ref: 'DirectorFile', default: null })
  documentId!: Types.ObjectId | null;
}

export const ProposedShareholdingLineSchema =
  SchemaFactory.createForClass(ProposedShareholdingLine);

/**
 * Any company shareholding change requires approval before a new version is written.
 */
@Schema({
  collection: 'shareholding_change_requests',
  timestamps: true,
})
export class ShareholdingChangeRequest {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ type: String, trim: true, default: null })
  approvalReference!: string | null;

  @Prop({ type: [ProposedShareholdingLineSchema], required: true })
  proposedHoldings!: ProposedShareholdingLine[];

  @Prop({
    type: String,
    enum: ShareholdingChangeStatus,
    default: ShareholdingChangeStatus.Pending,
    index: true,
  })
  status!: ShareholdingChangeStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  approvalNote!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  /** Version number applied on approval */
  @Prop({ type: Number, default: null })
  appliedVersion!: number | null;

  createdAt?: Date;
}

export const ShareholdingChangeRequestSchema = SchemaFactory.createForClass(
  ShareholdingChangeRequest,
);

ShareholdingChangeRequestSchema.plugin(baseSchemaPlugin);
ShareholdingChangeRequestSchema.plugin(softDeletePlugin);

ShareholdingChangeRequestSchema.index({ companyId: 1, status: 1, createdAt: -1 });
