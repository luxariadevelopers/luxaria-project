import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  AddressEmbed,
  AddressEmbedSchema,
} from '../../company/schemas/address.embed';
import {
  defaultProjectFinancialConfig,
  ProjectFinancialConfigEmbed,
  ProjectFinancialConfigEmbedSchema,
} from './project-financial-config.embed';
import {
  defaultProjectSettings,
  ProjectSettingsEmbed,
  ProjectSettingsEmbedSchema,
} from './project-settings.embed';
import { ReraDetailsEmbed, ReraDetailsEmbedSchema } from './rera-details.embed';

export type ProjectDocument = HydratedDocument<Project>;

export enum ProjectStatus {
  Draft = 'Draft',
  Planning = 'Planning',
  Approval = 'Approval',
  PreConstruction = 'Pre-Construction',
  Construction = 'Construction',
  Active = 'Active',
  OnHold = 'On Hold',
  Completed = 'Completed',
  Closed = 'Closed',
  Archived = 'Archived',
  Cancelled = 'Cancelled',
}

export enum ProjectType {
  Residential = 'residential',
  Commercial = 'commercial',
  MixedUse = 'mixed_use',
  Plotting = 'plotting',
  Infrastructure = 'infrastructure',
  Other = 'other',
}

export enum ProjectStage {
  Concept = 'concept',
  Design = 'design',
  Approvals = 'approvals',
  Mobilisation = 'mobilisation',
  Structure = 'structure',
  Finishing = 'finishing',
  Handover = 'handover',
  Closed = 'closed',
}

@Schema({
  collection: 'projects',
  timestamps: true,
})
export class Project {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  projectCode!: string;

  @Prop({ required: true, trim: true })
  projectName!: string;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: String, enum: ProjectType, required: true, index: true })
  projectType!: ProjectType;

  @Prop({ type: AddressEmbedSchema, required: true })
  address!: AddressEmbed;

  @Prop({ type: Number, default: null })
  latitude!: number | null;

  @Prop({ type: Number, default: null })
  longitude!: number | null;

  /**
   * Geofence radius (meters) around project coordinates.
   * Used for site-expense GPS warnings when latitude/longitude are set.
   */
  @Prop({ type: Number, default: null, min: 0 })
  siteRadiusMeters!: number | null;

  /** Land area in sq.ft */
  @Prop({ type: Number, default: null, min: 0 })
  landArea!: number | null;

  /** Built-up area in sq.ft */
  @Prop({ type: Number, default: null, min: 0 })
  builtUpArea!: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  numberOfBlocks!: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  numberOfUnits!: number | null;

  @Prop({ type: Date, default: null, index: true })
  startDate!: Date | null;

  @Prop({ type: Date, default: null })
  expectedCompletionDate!: Date | null;

  @Prop({ type: Date, default: null })
  actualCompletionDate!: Date | null;

  @Prop({
    type: String,
    enum: ProjectStatus,
    default: ProjectStatus.Draft,
    index: true,
  })
  status!: ProjectStatus;

  /** Status captured when suspending to On Hold; cleared on resume. */
  @Prop({ type: String, enum: ProjectStatus, default: null })
  statusBeforeHold!: ProjectStatus | null;

  @Prop({ type: String, trim: true, default: null })
  clientName!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: 'INR' })
  currency!: string;

  @Prop({ type: String, trim: true, default: 'Asia/Kolkata' })
  timeZone!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'FinancialYear',
    default: null,
    index: true,
  })
  financialYearId!: Types.ObjectId | null;

  @Prop({
    type: ProjectSettingsEmbedSchema,
    default: () => defaultProjectSettings(),
  })
  settings!: ProjectSettingsEmbed;

  @Prop({
    type: ProjectFinancialConfigEmbedSchema,
    default: () => defaultProjectFinancialConfig(),
  })
  financialConfig!: ProjectFinancialConfigEmbed;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  projectManager!: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  assignedDirectors!: Types.ObjectId[];

  /** Bank account ref — validated when bank module exists */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  defaultBankAccount!: Types.ObjectId | null;

  @Prop({ type: Number, default: null, min: 0 })
  approvedBudget!: number | null;

  @Prop({
    type: String,
    enum: ProjectStage,
    default: ProjectStage.Concept,
    index: true,
  })
  projectStage!: ProjectStage;

  @Prop({ type: ReraDetailsEmbedSchema, default: () => ({}) })
  reraDetails!: ReraDetailsEmbed;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.plugin(baseSchemaPlugin);
ProjectSchema.plugin(softDeletePlugin);

ProjectSchema.index({ projectName: 'text', projectCode: 'text', description: 'text' });
ProjectSchema.index({ status: 1, projectType: 1 });
ProjectSchema.index({ projectManager: 1, status: 1 });
ProjectSchema.index({ assignedDirectors: 1 });
ProjectSchema.index({ companyId: 1, status: 1, createdAt: -1 });
