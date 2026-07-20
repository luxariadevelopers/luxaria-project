import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ManpowerDailyPlanDocument = HydratedDocument<ManpowerDailyPlan>;

export enum ManpowerPlanSource {
  Manual = 'manual',
  AgreementDefault = 'agreement_default',
  Copied = 'copied',
}

@Schema({ _id: true })
export class ManpowerPlanSkillLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LabourCategory', default: null })
  labourCategoryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, required: true })
  skill!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  plannedHeadcount!: number;

  @Prop({ type: Boolean, default: false })
  isCritical!: boolean;
}

export const ManpowerPlanSkillLineSchema = SchemaFactory.createForClass(
  ManpowerPlanSkillLine,
);

@Schema({
  collection: 'manpower_daily_plans',
  timestamps: true,
})
export class ManpowerDailyPlan {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  planNumber!: string;

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

  /** Calendar date of the plan (UTC midnight). */
  @Prop({ type: Date, required: true, index: true })
  planDate!: Date;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  plannedHeadcount!: number;

  @Prop({ type: [ManpowerPlanSkillLineSchema], default: [] })
  skillMix!: ManpowerPlanSkillLine[];

  @Prop({
    type: String,
    enum: ManpowerPlanSource,
    required: true,
    default: ManpowerPlanSource.Manual,
  })
  source!: ManpowerPlanSource;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ManpowerDailyPlanSchema =
  SchemaFactory.createForClass(ManpowerDailyPlan);

ManpowerDailyPlanSchema.plugin(baseSchemaPlugin);
ManpowerDailyPlanSchema.plugin(softDeletePlugin);

ManpowerDailyPlanSchema.index(
  { projectId: 1, contractorId: 1, planDate: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_manpower_daily_plan',
  },
);
ManpowerDailyPlanSchema.index({ projectId: 1, planDate: -1 });
