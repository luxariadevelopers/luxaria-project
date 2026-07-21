import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type EmployeeDocument = HydratedDocument<Employee>;

export enum EmployeeStatus {
  Draft = 'draft',
  Invited = 'invited',
  Active = 'active',
  Suspended = 'suspended',
  OnLeave = 'on_leave',
  Relieved = 'relieved',
  Terminated = 'terminated',
  Archived = 'archived',
}

/** Statuses that may authenticate (login / JWT). */
export const EMPLOYEE_LOGIN_ALLOWED_STATUSES: readonly EmployeeStatus[] = [
  EmployeeStatus.Active,
  EmployeeStatus.OnLeave,
  EmployeeStatus.Invited,
];

@Schema({
  collection: 'employees',
  timestamps: true,
})
export class Employee {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  employeeCode!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ type: String, trim: true, default: null })
  mobile!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Designation',
    required: true,
    index: true,
  })
  designationId!: Types.ObjectId;

  /** Matches User.reportingManager pattern (User ObjectId). */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  reportingManagerUserId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: 'full_time' })
  employmentType!: string;

  @Prop({ type: Date, default: null })
  joiningDate!: Date | null;

  @Prop({ type: Date, default: null })
  relievingDate!: Date | null;

  @Prop({
    type: String,
    enum: EmployeeStatus,
    default: EmployeeStatus.Draft,
    index: true,
  })
  status!: EmployeeStatus;

  @Prop({ type: String, trim: true, default: null })
  primaryWorkLocation!: string | null;

  @Prop({ type: String, trim: true, default: null })
  profilePhoto!: string | null;

  @Prop({ type: Object, default: null })
  emergencyContact!: Record<string, unknown> | null;

  /** Linked login user — unique sparse when set. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.plugin(baseSchemaPlugin);
EmployeeSchema.plugin(softDeletePlugin);

EmployeeSchema.index(
  { companyId: 1, employeeCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

EmployeeSchema.index(
  { companyId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

EmployeeSchema.index({ companyId: 1, status: 1 });

EmployeeSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: 'objectId' },
      isDeleted: false,
    },
  },
);
