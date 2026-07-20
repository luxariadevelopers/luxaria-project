import { DPR_ROUTES } from '@/dpr/routes';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import {
  NotificationEventType,
  type NotificationEventTypeCode,
} from './eventTypes';
import type { PublicNotification } from './types';

/** 24-char hex Mongo ObjectId (matches class-validator `@IsMongoId`). */
const MONGO_ID_RE = /^[a-f\d]{24}$/i;

export type EntityLinkRule = {
  /** Normalised lowercase entityType values accepted from the API. */
  entityTypes: readonly string[];
  /** Optional eventType fallback when entityType is absent. */
  eventTypes?: readonly NotificationEventTypeCode[];
  /** Absolute app path that must exist in the route registry. */
  path: string;
  /** Catalog permissions required to follow the link. */
  anyOf: readonly PermissionCode[];
  /** When true, navigation should activate `projectId` if present. */
  requiresProject?: boolean;
  label: string;
};

/**
 * Only maps to shipped portal routes. Unknown entity types fail validation
 * (no invented deep-link paths).
 */
export const ENTITY_LINK_RULES: readonly EntityLinkRule[] = [
  {
    entityTypes: ['project', 'projects'],
    path: '/projects',
    anyOf: ['project.view'],
    label: 'Open projects',
  },
  {
    entityTypes: [
      'daily_progress_report',
      'dpr',
      'daily-progress-report',
      'daily_progress_reports',
    ],
    eventTypes: [NotificationEventType.MissingDpr],
    path: DPR_ROUTES.list,
    anyOf: ['dpr.view'],
    requiresProject: true,
    label: 'Open daily progress',
  },
] as const;

export type ResolvedEntityLink = {
  to: string;
  label: string;
  projectId: string | null;
  requiresProject: boolean;
};

export type EntityLinkContext = {
  hasAnyPermission: (permissions: string[]) => boolean;
};

export function isMongoObjectId(value: string | null | undefined): boolean {
  return Boolean(value && MONGO_ID_RE.test(value));
}

function findRule(
  notification: PublicNotification,
): EntityLinkRule | undefined {
  const entityType = notification.entityType?.trim().toLowerCase() ?? '';

  if (entityType) {
    const byEntity = ENTITY_LINK_RULES.find((rule) =>
      rule.entityTypes.includes(entityType),
    );
    if (byEntity) {
      return byEntity;
    }
  }

  return ENTITY_LINK_RULES.find((rule) =>
    rule.eventTypes?.includes(
      notification.eventType as NotificationEventTypeCode,
    ),
  );
}

/**
 * Validate entity link before navigation.
 * Returns null when the link is missing, malformed, unmapped, or forbidden.
 */
export function resolveNotificationEntityLink(
  notification: PublicNotification,
  ctx: EntityLinkContext,
): ResolvedEntityLink | null {
  const rule = findRule(notification);
  if (!rule) {
    return null;
  }

  if (!ctx.hasAnyPermission([...rule.anyOf])) {
    return null;
  }

  // When an entity id is present it must be a valid ObjectId.
  if (
    notification.entityId &&
    !isMongoObjectId(notification.entityId)
  ) {
    return null;
  }

  // Entity-typed rules require a valid entity id when entityType was set.
  if (
    notification.entityType &&
    (!notification.entityId || !isMongoObjectId(notification.entityId))
  ) {
    return null;
  }

  if (
    rule.requiresProject &&
    notification.projectId &&
    !isMongoObjectId(notification.projectId)
  ) {
    return null;
  }

  return {
    to: rule.path,
    label: rule.label,
    projectId: notification.projectId,
    requiresProject: Boolean(rule.requiresProject),
  };
}
