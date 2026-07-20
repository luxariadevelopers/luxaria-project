import { Notification } from '../models';
import { emitCompany, emitProject } from './realtime';

export async function notify(params: {
  companyId: string;
  projectId?: string;
  userId?: string;
  roles?: string[];
  type: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  const doc = await Notification.create({
    companyId: params.companyId,
    projectId: params.projectId,
    userId: params.userId,
    roles: params.roles || [],
    type: params.type,
    title: params.title,
    body: params.body,
    meta: params.meta,
    readBy: [],
  });
  emitCompany(params.companyId, 'notification', doc);
  if (params.projectId) emitProject(params.projectId, 'notification', doc);
  return doc;
}
