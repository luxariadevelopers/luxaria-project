import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Locked = 'locked',
}

/** How multiple reporting officers approve subordinate actions. */
export enum ReportingApprovalMode {
  Any = 'any',
  All = 'all',
}

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({ required: true, unique: true, trim: true })
  userCode!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  mobile!: string | null;

  /** Argon2id hash — never store plain passwords. */
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, trim: true, default: null, index: true })
  employeeId!: string | null;

  @Prop({ type: String, trim: true, default: null })
  designation!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  department!: string | null;

  @Prop({ type: String, trim: true, default: null })
  profilePhoto!: string | null;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.Active, index: true })
  status!: UserStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  assignedProjects!: Types.ObjectId[];

  /**
   * Tenant/company membership (R-003B).
   * Null = inherit primary company (single-tenant default).
   * When set, all project access is restricted to this company.
   */
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  /** Role ObjectIds — validated against active roles in RBAC module. */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roleIds!: Types.ObjectId[];

  /**
   * Primary reporting officer (backward-compatible single field).
   * When `reportingOfficers` is set, this must be one of them.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reportingManager!: Types.ObjectId | null;

  /** Officers who can approve for this user (includes primary). */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  reportingOfficers!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ReportingApprovalMode,
    default: ReportingApprovalMode.Any,
  })
  reportingApprovalMode!: ReportingApprovalMode;

  @Prop({ type: Date, default: null })
  joiningDate!: Date | null;

  /** When true, user must set a new password after login before using the app. */
  @Prop({ type: Boolean, default: false })
  mustChangePassword!: boolean;

  @Prop({ type: Number, default: 0 })
  failedLoginAttempts!: number;

  @Prop({ type: Date, default: null })
  lockUntil!: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.plugin(baseSchemaPlugin);
UserSchema.plugin(softDeletePlugin);

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    // MongoDB partial indexes do not allow $ne; match active (non-deleted) docs only.
    partialFilterExpression: { email: { $type: 'string' }, isDeleted: false },
  },
);

UserSchema.index(
  { mobile: 1 },
  {
    unique: true,
    partialFilterExpression: { mobile: { $type: 'string' }, isDeleted: false },
  },
);

UserSchema.index({ assignedProjects: 1 });
UserSchema.index({ roleIds: 1 });
UserSchema.index({ fullName: 'text', email: 'text', mobile: 'text', employeeId: 'text' });
