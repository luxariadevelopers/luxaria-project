import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectAssignmentDocument = HydratedDocument<ProjectAssignment>;

export enum ProjectAccessStatus {
  Active = 'active',
  Inactive = 'inactive',
  Expired = 'expired',
}

@Schema({
  collection: 'project_assignments',
  timestamps: true,
})
export class ProjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  /**
   * Target project. Null when globalAccess is true (all projects).
   * Site engineers / investors / purchase users receive specific projectIds.
   */
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  /**
   * When true, user may access any project for the assignment window.
   * Directors (and others) receive this only through configuration — never by role code.
   */
  @Prop({ type: Boolean, default: false, index: true })
  globalAccess!: boolean;

  @Prop({ type: Date, required: true, index: true })
  accessStartDate!: Date;

  @Prop({ type: Date, default: null, index: true })
  accessEndDate!: Date | null;

  @Prop({
    type: String,
    enum: ProjectAccessStatus,
    default: ProjectAccessStatus.Active,
    index: true,
  })
  status!: ProjectAccessStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const ProjectAssignmentSchema = SchemaFactory.createForClass(ProjectAssignment);

ProjectAssignmentSchema.plugin(baseSchemaPlugin);
ProjectAssignmentSchema.plugin(softDeletePlugin);

ProjectAssignmentSchema.index(
  { userId: 1, projectId: 1, globalAccess: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      globalAccess: false,
      projectId: { $type: 'objectId' },
    },
  },
);

ProjectAssignmentSchema.index(
  { userId: 1, globalAccess: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      globalAccess: true,
    },
  },
);

ProjectAssignmentSchema.index({ userId: 1, status: 1, accessEndDate: 1 });
