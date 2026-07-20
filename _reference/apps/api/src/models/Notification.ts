import mongoose, { Schema, Types } from 'mongoose';

export interface INotification {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  userId?: Types.ObjectId;
  roles: string[];
  type: string;
  title: string;
  body: string;
  readBy: Types.ObjectId[];
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    roles: [{ type: String }],
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
