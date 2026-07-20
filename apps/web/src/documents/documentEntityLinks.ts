import type { PublicDocument } from '@luxaria/shared-types';
import {
  ENTITY_LINK_RULES,
  isMongoObjectId,
  type EntityLinkContext,
  type ResolvedEntityLink,
} from '@/notifications/entityLinks';

/**
 * Map a document’s entity to a shipped portal route (same allow-list as
 * notifications — no invented deep links).
 */
export function resolveDocumentEntityLink(
  doc: Pick<PublicDocument, 'entityType' | 'entityId' | 'projectId'>,
  ctx: EntityLinkContext,
): ResolvedEntityLink | null {
  const entityType = doc.entityType.trim().toLowerCase();
  if (!entityType || !isMongoObjectId(doc.entityId)) {
    return null;
  }

  const rule = ENTITY_LINK_RULES.find((r) =>
    r.entityTypes.includes(entityType),
  );
  if (!rule) {
    return null;
  }
  if (!ctx.hasAnyPermission([...rule.anyOf])) {
    return null;
  }

  if (
    rule.requiresProject &&
    doc.projectId &&
    !isMongoObjectId(doc.projectId)
  ) {
    return null;
  }

  return {
    to: rule.path,
    label: rule.label,
    projectId: doc.projectId,
    requiresProject: Boolean(rule.requiresProject),
  };
}

/** UI-safe document fields — never surface `s3Key` in tables or copy. */
export function toLibraryDocumentRow(doc: PublicDocument): Omit<
  PublicDocument,
  's3Key'
> & { s3Key?: never } {
  const { s3Key: _omit, ...rest } = doc;
  return rest;
}
