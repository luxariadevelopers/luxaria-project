import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorProjectAssignmentDocument =
  HydratedDocument<ContractorProjectAssignment>;

export enum ContractorProjectAssignmentStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'contractor_project_assignments',
  timestamps: true,
})
export class ContractorProjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ContractorProjectAssignmentStatus,
    default: ContractorProjectAssignmentStatus.Active,
    index: true,
  })
  status!: ContractorProjectAssignmentStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  assignedAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorProjectAssignmentSchema = SchemaFactory.createForClass(
  ContractorProjectAssignment,
);

ContractorProjectAssignmentSchema.plugin(baseSchemaPlugin);
ContractorProjectAssignmentSchema.plugin(softDeletePlugin);

ContractorProjectAssignmentSchema.index(
  { contractorId: 1, projectId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'contractor_project_unique_active',
  },
);
