import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type PermissionOverrideDocument = HydratedDocument<PermissionOverride>;

export enum PermissionOverrideEffect {
  Allow = 'allow',
  Deny = 'deny',
}

export enum PermissionOverrideStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'permission_overrides',
  timestamps: true,
})
export class PermissionOverride {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  permission!: string;

  @Prop({
    type: String,
    enum: PermissionOverrideEffect,
    required: true,
  })
  effect!: PermissionOverrideEffect;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  @Prop({ type: Date, default: null, index: true })
  effectiveTo!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  /**
   * Optional scope metadata. Allow overrides must not expand project/site
   * membership — that is enforced at the project/site access layer.
   */
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: PermissionOverrideStatus,
    default: PermissionOverrideStatus.Active,
    index: true,
  })
  status!: PermissionOverrideStatus;
}

export const PermissionOverrideSchema =
  SchemaFactory.createForClass(PermissionOverride);

PermissionOverrideSchema.plugin(baseSchemaPlugin);
PermissionOverrideSchema.plugin(softDeletePlugin);

PermissionOverrideSchema.index({
  userId: 1,
  status: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
});
PermissionOverrideSchema.index({ companyId: 1, userId: 1, permission: 1 });
