import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadSource {
  WalkIn = 'walk_in',
  Website = 'website',
  Referral = 'referral',
  ChannelPartner = 'channel_partner',
  ExistingCustomer = 'existing_customer',
  Broker = 'broker',
  DigitalMarketing = 'digital_marketing',
  Campaign = 'campaign',
  Other = 'other',
}

export enum LeadStatus {
  New = 'new',
  Contacted = 'contacted',
  Qualified = 'qualified',
  SiteVisit = 'site_visit',
  Proposal = 'proposal',
  Negotiation = 'negotiation',
  Won = 'won',
  Lost = 'lost',
}

export enum LeadTaskStatus {
  Open = 'open',
  Done = 'done',
}

@Schema({ _id: false })
export class LeadContact {
  @Prop({ type: String, required: true, trim: true })
  fullName!: string;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  alternatePhone!: string | null;
}

export const LeadContactSchema = SchemaFactory.createForClass(LeadContact);

@Schema({ _id: true })
export class LeadFollowUp {
  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop({ type: String, required: true, trim: true })
  note!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  by!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  nextFollowUpAt!: Date | null;
}

export const LeadFollowUpSchema = SchemaFactory.createForClass(LeadFollowUp);

@Schema({ _id: true })
export class LeadTask {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: Date, default: null })
  dueAt!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  completedBy!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: LeadTaskStatus,
    default: LeadTaskStatus.Open,
  })
  status!: LeadTaskStatus;
}

export const LeadTaskSchema = SchemaFactory.createForClass(LeadTask);

@Schema({ _id: true })
export class LeadAttachment {
  @Prop({ type: String, required: true, trim: true })
  fileName!: string;

  @Prop({ type: String, required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, required: true, trim: true })
  mimeType!: string;

  @Prop({ type: Number, required: true, min: 0 })
  sizeBytes!: number;

  @Prop({ type: Date, required: true })
  uploadedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;
}

export const LeadAttachmentSchema = SchemaFactory.createForClass(LeadAttachment);

@Schema({
  collection: 'leads',
  timestamps: true,
})
export class Lead {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  leadNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: LeadSource,
    required: true,
    index: true,
  })
  source!: LeadSource;

  @Prop({ type: String, trim: true, default: null })
  campaignName!: string | null;

  @Prop({
    type: String,
    enum: LeadStatus,
    required: true,
    default: LeadStatus.New,
    index: true,
  })
  status!: LeadStatus;

  @Prop({ type: LeadContactSchema, required: true })
  contact!: LeadContact;

  @Prop({ type: String, trim: true, default: null })
  familyDetails!: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  budgetMin!: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  budgetMax!: number | null;

  @Prop({ type: String, trim: true, default: null })
  preferredLocation!: string | null;

  @Prop({ type: String, trim: true, default: null })
  unitPreference!: string | null;

  @Prop({ type: String, trim: true, default: null })
  fundingSource!: string | null;

  @Prop({ type: Boolean, default: false })
  loanRequired!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  assignedTo!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Customer', default: null, index: true })
  convertedCustomerId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  lostReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: [LeadFollowUpSchema], default: [] })
  followUps!: LeadFollowUp[];

  @Prop({ type: [LeadTaskSchema], default: [] })
  tasks!: LeadTask[];

  @Prop({ type: [LeadAttachmentSchema], default: [] })
  attachments!: LeadAttachment[];

  @Prop({ type: Date, default: null })
  siteVisitAt!: Date | null;

  @Prop({ type: Date, default: null })
  wonAt!: Date | null;

  @Prop({ type: Date, default: null })
  lostAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.plugin(baseSchemaPlugin);
LeadSchema.plugin(softDeletePlugin);

LeadSchema.index({ companyId: 1, status: 1 });
LeadSchema.index({ projectId: 1, status: 1 });
LeadSchema.index({ createdAt: -1 });

export const LEAD_HAPPY_PATH: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.Qualified,
  LeadStatus.SiteVisit,
  LeadStatus.Proposal,
  LeadStatus.Negotiation,
  LeadStatus.Won,
];

export const TERMINAL_LEAD_STATUSES: LeadStatus[] = [
  LeadStatus.Won,
  LeadStatus.Lost,
];
