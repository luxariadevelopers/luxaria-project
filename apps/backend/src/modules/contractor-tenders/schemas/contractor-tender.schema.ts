import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type ContractorTenderDocument = HydratedDocument<ContractorTender>;

export enum ContractorTenderStatus {
  Draft = 'draft',
  Invited = 'invited',
  Bidding = 'bidding',
  UnderEvaluation = 'under_evaluation',
  Awarded = 'awarded',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class TenderCommercialBidLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', default: null })
  boqItemId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  /** quantity × rate */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;
}

export const TenderCommercialBidLineSchema = SchemaFactory.createForClass(
  TenderCommercialBidLine,
);

@Schema({ _id: true })
export class TenderTechnicalBid {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  complianceNotes!: string | null;

  /** Optional 0–100 technical score */
  @Prop({ type: Number, min: 0, max: 100, default: null })
  technicalScore!: number | null;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'StoredDocument' }],
    default: [],
  })
  documentIds!: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  submittedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy!: Types.ObjectId;
}

export const TenderTechnicalBidSchema =
  SchemaFactory.createForClass(TenderTechnicalBid);

@Schema({ _id: true })
export class TenderCommercialBid {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: [TenderCommercialBidLineSchema], default: [] })
  lines!: TenderCommercialBidLine[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalAmount!: number;

  @Prop({ type: Number, min: 0, default: null })
  validityDays!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Date, required: true })
  submittedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy!: Types.ObjectId;
}

export const TenderCommercialBidSchema =
  SchemaFactory.createForClass(TenderCommercialBid);

@Schema({ _id: false })
export class TenderNegotiationNote {
  @Prop({ type: String, trim: true, required: true })
  note!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export const TenderNegotiationNoteSchema = SchemaFactory.createForClass(
  TenderNegotiationNote,
);

@Schema({ _id: false })
export class TenderRecommendation {
  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true })
  recommendedContractorId!: Types.ObjectId;

  @Prop({ type: String, trim: true, required: true })
  rationale!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recommendedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  recommendedAt!: Date;
}

export const TenderRecommendationSchema = SchemaFactory.createForClass(
  TenderRecommendation,
);

@Schema({
  collection: 'contractor_tenders',
  timestamps: true,
})
export class ContractorTender {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  tenderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true, maxlength: 240 })
  title!: string;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  /** BOQ package / package-root refs for this tender scope */
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'BoqItem' }],
    default: [],
  })
  boqPackageIds!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ContractorTenderStatus,
    default: ContractorTenderStatus.Draft,
    index: true,
  })
  status!: ContractorTenderStatus;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Contractor' }],
    default: [],
  })
  invitedContractorIds!: Types.ObjectId[];

  @Prop({ type: [TenderTechnicalBidSchema], default: [] })
  technicalBids!: TenderTechnicalBid[];

  @Prop({ type: [TenderCommercialBidSchema], default: [] })
  commercialBids!: TenderCommercialBid[];

  @Prop({ type: [TenderNegotiationNoteSchema], default: [] })
  negotiationNotes!: TenderNegotiationNote[];

  @Prop({ type: TenderRecommendationSchema, default: null })
  recommendation!: TenderRecommendation | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', default: null, index: true })
  awardedContractorId!: Types.ObjectId | null;

  /** Optional link to a rate-contract document (W3) */
  @Prop({ type: Types.ObjectId, default: null })
  awardedRateContractId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    default: null,
  })
  awardedAgreementId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  invitationDate!: Date | null;

  @Prop({ type: Date, default: null, index: true })
  bidDeadline!: Date | null;

  @Prop({ type: Date, default: null })
  evaluationStartedAt!: Date | null;

  @Prop({ type: Date, default: null })
  awardedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  awardedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorTenderSchema =
  SchemaFactory.createForClass(ContractorTender);

ContractorTenderSchema.plugin(baseSchemaPlugin);
ContractorTenderSchema.plugin(softDeletePlugin);

ContractorTenderSchema.index({ projectId: 1, status: 1, createdAt: -1 });
ContractorTenderSchema.index({ projectId: 1, siteId: 1, status: 1 });
ContractorTenderSchema.index({ projectId: 1, awardedContractorId: 1 });
