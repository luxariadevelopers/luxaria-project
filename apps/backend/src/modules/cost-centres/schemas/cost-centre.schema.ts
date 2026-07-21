import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CostCentreDocument = HydratedDocument<CostCentre>;

export enum CostCentreKind {
  CostCentre = 'cost_centre',
  ProfitCentre = 'profit_centre',
}

export enum CostCentreStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'cost_centres',
  timestamps: true,
})
export class CostCentre {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: CostCentreKind,
    required: true,
    index: true,
  })
  kind!: CostCentreKind;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'CostCentre', default: null, index: true })
  parentId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: CostCentreStatus,
    default: CostCentreStatus.Active,
    index: true,
  })
  status!: CostCentreStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const CostCentreSchema = SchemaFactory.createForClass(CostCentre);

CostCentreSchema.plugin(baseSchemaPlugin);
CostCentreSchema.plugin(softDeletePlugin);

CostCentreSchema.index({ companyId: 1, kind: 1, status: 1 });
CostCentreSchema.index({ companyId: 1, projectId: 1, status: 1 });
CostCentreSchema.index({ parentId: 1, code: 1 });
