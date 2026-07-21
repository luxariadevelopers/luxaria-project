import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteAssignmentDocument = HydratedDocument<SiteAssignment>;

export enum SiteAssignmentStatus {
  Active = 'active',
  Inactive = 'inactive',
  Expired = 'expired',
}

@Schema({
  collection: 'site_assignments',
  timestamps: true,
})
export class SiteAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null, index: true })
  employeeId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', required: true, index: true })
  siteId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectAssignment',
    default: null,
  })
  projectAssignmentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  roleInSite!: string | null;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  @Prop({ type: Date, default: null, index: true })
  effectiveTo!: Date | null;

  @Prop({
    type: String,
    enum: SiteAssignmentStatus,
    default: SiteAssignmentStatus.Active,
    index: true,
  })
  status!: SiteAssignmentStatus;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedBy!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const SiteAssignmentSchema = SchemaFactory.createForClass(SiteAssignment);

SiteAssignmentSchema.plugin(baseSchemaPlugin);
SiteAssignmentSchema.plugin(softDeletePlugin);

SiteAssignmentSchema.index(
  { userId: 1, projectId: 1, siteId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: SiteAssignmentStatus.Active,
    },
  },
);

SiteAssignmentSchema.index({ companyId: 1, userId: 1, status: 1 });
SiteAssignmentSchema.index({ projectId: 1, siteId: 1, status: 1 });
SiteAssignmentSchema.index({ userId: 1, status: 1, effectiveTo: 1 });
