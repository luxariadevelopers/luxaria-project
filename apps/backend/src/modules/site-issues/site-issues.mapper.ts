import type { Types } from 'mongoose';
import type {
  SiteIssueSeverity,
  SiteIssueStatus,
  SiteIssueType,
} from './schemas/site-issue.schema';

export type PublicSiteIssue = {
  id: string;
  issueNumber: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  type: SiteIssueType;
  title: string;
  description: string | null;
  status: SiteIssueStatus;
  assigneeUserId: string | null;
  severity: SiteIssueSeverity;
  resolvedAt: Date | null;
  closedAt: Date | null;
  photoDocumentIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSiteIssue(row: {
  _id: Types.ObjectId | string;
  issueNumber: string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  type: SiteIssueType;
  title: string;
  description?: string | null;
  status: SiteIssueStatus;
  assigneeUserId?: Types.ObjectId | string | null;
  severity: SiteIssueSeverity;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSiteIssue {
  return {
    id: String(row._id),
    issueNumber: row.issueNumber,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    dprId: oid(row.dprId),
    type: row.type,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    assigneeUserId: oid(row.assigneeUserId),
    severity: row.severity,
    resolvedAt: row.resolvedAt ?? null,
    closedAt: row.closedAt ?? null,
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
