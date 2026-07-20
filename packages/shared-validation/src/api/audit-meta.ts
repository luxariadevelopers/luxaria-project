/**
 * Client-facing audit / soft-delete fields from
 * `apps/backend/src/database/plugins/base-schema.plugin.ts`.
 *
 * Wire format uses ISO-8601 strings and string ids (ObjectId hex),
 * preserving backend nullability.
 */
export type AuditMeta = {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
};
