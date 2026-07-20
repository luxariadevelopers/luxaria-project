import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ManpowerShortfallAlertDocument =
  HydratedDocument<ManpowerShortfallAlert>;

export enum ManpowerShortfallAlertType {
  Below80TwoConsecutiveDays = 'below_80_two_consecutive_days',
  Below60ThreeDays = 'below_60_three_days',
  MissingCriticalSkill = 'missing_critical_skill',
  WorkProgressBehindPlan = 'work_progress_behind_plan',
  NoAttendanceSubmitted = 'no_attendance_submitted',
}

export enum ManpowerEscalation {
  SiteSupervisor = 'site_supervisor',
  ProjectManager = 'project_manager',
  CommercialAndPm = 'commercial_and_pm',
  Director = 'director',
}

@Schema({ _id: false })
export class ManpowerSkillGap {
  @Prop({ type: String, trim: true, required: true })
  skill!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  committedHeadcount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  plannedHeadcount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  actualHeadcount!: number;

  @Prop({ type: Boolean, default: false })
  isCritical!: boolean;

  @Prop({ type: Boolean, default: false })
  missing!: boolean;
}

export const ManpowerSkillGapSchema =
  SchemaFactory.createForClass(ManpowerSkillGap);

@Schema({
  collection: 'manpower_shortfall_alerts',
  timestamps: true,
})
export class ManpowerShortfallAlert {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    default: null,
    index: true,
  })
  agreementId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  agreementNumber!: string | null;

  /** Evaluation day (UTC midnight). */
  @Prop({ type: Date, required: true, index: true })
  asOfDate!: Date;

  @Prop({
    type: String,
    enum: ManpowerShortfallAlertType,
    required: true,
    index: true,
  })
  alertType!: ManpowerShortfallAlertType;

  @Prop({ type: String, trim: true, required: true })
  message!: string;

  /** Shortfall vs planned/expected headcount (0–100). */
  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  shortfallPercent!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  consecutiveDays!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  agreementHeadcount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  plannedHeadcount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  actualHeadcount!: number;

  @Prop({ type: [ManpowerSkillGapSchema], default: [] })
  skillGaps!: ManpowerSkillGap[];

  /** Estimated schedule slip in days. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  expectedScheduleImpactDays!: number;

  @Prop({
    type: String,
    enum: ManpowerEscalation,
    required: true,
  })
  recommendedEscalation!: ManpowerEscalation;

  @Prop({ type: Boolean, default: false, index: true })
  acknowledged!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acknowledgedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ManpowerShortfallAlertSchema = SchemaFactory.createForClass(
  ManpowerShortfallAlert,
);

ManpowerShortfallAlertSchema.plugin(baseSchemaPlugin);
ManpowerShortfallAlertSchema.plugin(softDeletePlugin);

ManpowerShortfallAlertSchema.index(
  { projectId: 1, contractorId: 1, asOfDate: 1, alertType: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_manpower_shortfall_alert_day',
  },
);
ManpowerShortfallAlertSchema.index({
  projectId: 1,
  acknowledged: 1,
  asOfDate: -1,
});
