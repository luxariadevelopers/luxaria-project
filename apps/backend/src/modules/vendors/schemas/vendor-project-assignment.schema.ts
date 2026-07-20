import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type VendorProjectAssignmentDocument =
  HydratedDocument<VendorProjectAssignment>;

export enum VendorProjectAssignmentStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'vendor_project_assignments',
  timestamps: true,
})
export class VendorProjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: VendorProjectAssignmentStatus,
    default: VendorProjectAssignmentStatus.Active,
    index: true,
  })
  status!: VendorProjectAssignmentStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  assignedAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorProjectAssignmentSchema = SchemaFactory.createForClass(
  VendorProjectAssignment,
);

VendorProjectAssignmentSchema.plugin(baseSchemaPlugin);
VendorProjectAssignmentSchema.plugin(softDeletePlugin);

VendorProjectAssignmentSchema.index(
  { vendorId: 1, projectId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'vendor_project_unique_active',
  },
);
