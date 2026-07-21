import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DesignationDocument = HydratedDocument<Designation>;

export enum DesignationStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'designations',
  timestamps: true,
})
export class Designation {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null, index: true })
  departmentId!: Types.ObjectId | null;

  /** Default RBAC role code when provisioning (e.g. SITE_ENGINEER). */
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  defaultRoleCode!: string | null;

  @Prop({ type: Number, default: null })
  reportingLevel!: number | null;

  @Prop({ type: Boolean, default: false })
  mobileEligible!: boolean;

  @Prop({
    type: String,
    enum: DesignationStatus,
    default: DesignationStatus.Active,
    index: true,
  })
  status!: DesignationStatus;
}

export const DesignationSchema = SchemaFactory.createForClass(Designation);

DesignationSchema.plugin(baseSchemaPlugin);
DesignationSchema.plugin(softDeletePlugin);

DesignationSchema.index(
  { companyId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
