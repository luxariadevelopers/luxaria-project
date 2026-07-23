import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectParticipantDocument = HydratedDocument<ProjectParticipant>;

/**
 * Project capital / JV participants — independent of company equity shareholding.
 */
export enum ParticipantType {
  Director = 'director',
  OutsideInvestor = 'outside_investor',
  Company = 'company',
  JointVentureParty = 'joint_venture_party',
}

export enum InstrumentType {
  DirectorLoan = 'director_loan',
  UnsecuredLoan = 'unsecured_loan',
  ProjectInvestment = 'project_investment',
  EquityContribution = 'equity_contribution',
  JointVentureContribution = 'joint_venture_contribution',
  Other = 'other',
}

export enum ParticipantApprovalStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
}

/** How a loan participant is expected to be repaid. */
export enum RepaymentMode {
  Lumpsum = 'lumpsum',
  WithInterest = 'with_interest',
}

@Schema({
  collection: 'project_participants',
  timestamps: true,
})
export class ProjectParticipant {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: String, enum: ParticipantType, required: true, index: true })
  participantType!: ParticipantType;

  /**
   * Polymorphic id: Director | Investor | Company depending on participantType.
   * Joint venture party may reference Company or Investor.
   */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  participantId!: Types.ObjectId;

  /** Stable identity across versions: `${participantType}:${participantId}` */
  @Prop({ required: true, trim: true, index: true })
  participantKey!: string;

  /** Denormalized label for history display */
  @Prop({ type: String, trim: true, default: null })
  participantLabel!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  commitmentAmount!: number;

  @Prop({ type: Date, default: null })
  expectedContributionDate!: Date | null;

  @Prop({ type: Number, default: 0, min: 0 })
  actualContributionAmount!: number;

  /**
   * Project profit share % for this version (NOT company equity shareholding).
   */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  approvedProfitSharePercentage!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  lossSharePercentage!: number;

  /** Required for loan instruments when repaymentMode is with_interest (or unset). */
  @Prop({ type: Number, default: null, min: 0 })
  interestRate!: number | null;

  /**
   * % of project approvedBudget this party is expected to fund.
   * Typical for outside investors; optional for directors.
   */
  @Prop({ type: Number, default: null, min: 0, max: 100 })
  budgetInvestmentPercentage!: number | null;

  /** Loan repayment style — null for non-loan / unset. */
  @Prop({ type: String, enum: RepaymentMode, default: null })
  repaymentMode!: RepaymentMode | null;

  @Prop({ type: String, enum: InstrumentType, required: true, index: true })
  instrumentType!: InstrumentType;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  /** Null while this version is the current active/open record for the participantKey */
  @Prop({ type: Date, default: null, index: true })
  effectiveTo!: Date | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipantFile',
    default: null,
  })
  agreementDocumentId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ParticipantApprovalStatus,
    default: ParticipantApprovalStatus.Draft,
    index: true,
  })
  status!: ParticipantApprovalStatus;

  /** Version within participantKey history (monotonic per key) */
  @Prop({ type: Number, required: true, min: 1, index: true })
  version!: number;

  @Prop({ type: Types.ObjectId, ref: 'ProjectParticipant', default: null })
  supersedesId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProjectParticipantSchema =
  SchemaFactory.createForClass(ProjectParticipant);

ProjectParticipantSchema.plugin(baseSchemaPlugin);
ProjectParticipantSchema.plugin(softDeletePlugin);

ProjectParticipantSchema.index({ projectId: 1, participantKey: 1, version: -1 });
ProjectParticipantSchema.index({ projectId: 1, status: 1, effectiveTo: 1 });
/** One active approved profit-share line per participant */
ProjectParticipantSchema.index(
  { projectId: 1, participantKey: 1 },
  {
    name: 'one_active_approved_participant',
    unique: true,
    partialFilterExpression: {
      effectiveTo: null,
      isDeleted: false,
      status: ParticipantApprovalStatus.Approved,
    },
  },
);
/** At most one in-flight draft/submitted version per participant */
ProjectParticipantSchema.index(
  { projectId: 1, participantKey: 1 },
  {
    name: 'one_pending_participant_version',
    unique: true,
    partialFilterExpression: {
      effectiveTo: null,
      isDeleted: false,
      status: {
        $in: [
          ParticipantApprovalStatus.Draft,
          ParticipantApprovalStatus.Submitted,
        ],
      },
    },
  },
);
