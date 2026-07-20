import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type UnauthorizedProjectAccessDocument = HydratedDocument<UnauthorizedProjectAccess>;

export type ProjectAccessOperation = 'create' | 'read' | 'update' | 'approve';

@Schema({
  collection: 'unauthorized_project_access_attempts',
  timestamps: { createdAt: true, updatedAt: false },
})
export class UnauthorizedProjectAccess {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, index: true })
  operation!: ProjectAccessOperation | string;

  @Prop({ type: String, required: true })
  reason!: string;

  @Prop({ type: String, default: null })
  path!: string | null;

  @Prop({ type: String, default: null })
  method!: string | null;

  @Prop({ type: String, default: null })
  requestId!: string | null;

  @Prop({ type: String, default: null })
  ip!: string | null;

  createdAt?: Date;
}

export const UnauthorizedProjectAccessSchema =
  SchemaFactory.createForClass(UnauthorizedProjectAccess);

UnauthorizedProjectAccessSchema.index({ createdAt: -1 });
UnauthorizedProjectAccessSchema.index({ userId: 1, createdAt: -1 });
