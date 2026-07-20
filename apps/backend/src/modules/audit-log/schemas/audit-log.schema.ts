import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  POST = 'POST',
  REVERSE = 'REVERSE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  DOWNLOAD = 'DOWNLOAD',
  EXPORT = 'EXPORT',
}

/**
 * Immutable system audit log — insert only.
 * Never update or delete through application APIs or mongoose query helpers.
 */
@Schema({
  collection: 'audit_logs',
  timestamps: false,
  versionKey: false,
})
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: AuditAction,
    required: true,
    index: true,
  })
  action!: AuditAction;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  module!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  entityType!: string;

  @Prop({ type: String, default: null, index: true })
  entityId!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({ type: Object, default: null })
  beforeData!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  afterData!: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null, index: true })
  requestId!: string | null;

  @Prop({ type: String, default: null, index: true })
  deviceId!: string | null;

  @Prop({ type: Date, required: true, index: true })
  timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ module: 1, timestamp: -1 });
AuditLogSchema.index({ projectId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

AuditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'] as any,
  function () {
    throw new Error('Audit logs are immutable and cannot be updated');
  },
);

AuditLogSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'] as any,
  function () {
    throw new Error('Audit logs are immutable and cannot be deleted');
  },
);

AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be updated'));
  }
  return next();
});
