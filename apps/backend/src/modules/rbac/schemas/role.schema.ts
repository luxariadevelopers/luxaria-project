import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type RoleDocument = HydratedDocument<Role>;

export enum RoleStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'roles',
  timestamps: true,
})
export class Role {
  /** Stable machine code, e.g. SUPER_ADMIN, PROJECT_MANAGER */
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  /** Permission codes in module.action form */
  @Prop({ type: [String], default: [] })
  permissions!: string[];

  /**
   * When true, holders bypass all permission checks.
   * Only Super Admin is seeded with this flag — never hard-code director access.
   */
  @Prop({ type: Boolean, default: false })
  bypassPermissions!: boolean;

  /** Seeded roles cannot have their code changed or be hard-deleted via API */
  @Prop({ type: Boolean, default: false, index: true })
  isSystem!: boolean;

  @Prop({ type: String, enum: RoleStatus, default: RoleStatus.Active, index: true })
  status!: RoleStatus;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.plugin(baseSchemaPlugin);
RoleSchema.plugin(softDeletePlugin);

RoleSchema.index({ name: 1 });
RoleSchema.index({ status: 1, isDeleted: 1 });
