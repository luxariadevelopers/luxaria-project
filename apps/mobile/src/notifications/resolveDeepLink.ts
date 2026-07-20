import type {
  NotificationDeepLinkTarget,
  ResolveDeepLinkContext,
  ResolveDeepLinkInput,
  ResolveDeepLinkResult,
} from './types';

const MONGO_ID = /^[a-fA-F0-9]{24}$/;

type Candidate = {
  target: NotificationDeepLinkTarget;
  requiredPermissions: readonly string[];
  /** When true, entityId must be a Mongo ObjectId. */
  requireEntityId?: boolean;
};

/**
 * Maps Nest notification `entityType` / `eventType` to existing mobile routes.
 * Only entity types that have a real mobile screen are actionable.
 */
function candidateFromEntityType(
  entityType: string,
  entityId: string | null,
): Candidate | 'unknown' | null {
  switch (entityType) {
    case 'daily_progress_report':
      return {
        target: { screen: 'DailyProgressReport' },
        requiredPermissions: ['dpr.create'],
      };
    case 'goods_receipt':
      return {
        target: { screen: 'GoodsReceipt' },
        requiredPermissions: ['grn.create'],
      };
    case 'purchase_order':
      return {
        target: {
          screen: 'GoodsReceipt',
          params: entityId ? { purchaseOrderId: entityId } : undefined,
        },
        requiredPermissions: ['purchase.order', 'grn.create'],
        requireEntityId: true,
      };
    case 'project':
      return {
        target: { screen: 'Tabs', params: { screen: 'Projects' } },
        requiredPermissions: ['project.view'],
        requireEntityId: true,
      };
    default:
      return 'unknown';
  }
}

function candidateFromEventType(eventType: string): Candidate | null {
  switch (eventType) {
    case 'missing_dpr':
      return {
        target: { screen: 'DailyProgressReport' },
        requiredPermissions: ['dpr.create'],
      };
    default:
      return null;
  }
}

function normalize(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function denyProject(
  projectId: string | null,
  accessible: ReadonlySet<string>,
): string | null {
  if (!projectId) return null;
  if (!MONGO_ID.test(projectId)) {
    return 'Notification project id is invalid';
  }
  if (!accessible.has(projectId)) {
    return 'You do not have access to this notification project';
  }
  return null;
}

/**
 * Validate route + permissions (+ project access) before opening a notification.
 */
export function resolveNotificationDeepLink(
  input: ResolveDeepLinkInput,
  context: ResolveDeepLinkContext,
): ResolveDeepLinkResult {
  const entityType = normalize(input.entityType);
  const entityIdRaw = input.entityId?.trim() ?? null;
  const entityId = entityIdRaw && entityIdRaw.length ? entityIdRaw : null;
  const eventType = normalize(input.eventType);
  const projectId = input.projectId?.trim() || null;

  let candidate: Candidate | null = null;

  if (entityType) {
    const fromEntity = candidateFromEntityType(entityType, entityId);
    if (fromEntity === 'unknown') {
      return {
        status: 'invalid',
        reason: `Unsupported entity type "${entityType}" for mobile deep link`,
      };
    }
    candidate = fromEntity;
  } else if (eventType) {
    candidate = candidateFromEventType(eventType);
  }

  if (!candidate) {
    return {
      status: 'none',
      reason: 'This notification has no mobile deep link',
    };
  }

  if (candidate.requireEntityId) {
    if (!entityId) {
      return {
        status: 'invalid',
        reason: 'Deep link is missing a required entity id',
      };
    }
    if (!MONGO_ID.test(entityId)) {
      return {
        status: 'invalid',
        reason: 'Deep link entity id is not a valid record id',
      };
    }
  } else if (entityId && !MONGO_ID.test(entityId)) {
    return {
      status: 'invalid',
      reason: 'Deep link entity id is not a valid record id',
    };
  }

  const projectDeny = denyProject(projectId, context.accessibleProjectIds);
  if (projectDeny) {
    if (projectDeny.includes('invalid')) {
      return { status: 'invalid', reason: projectDeny };
    }
    return {
      status: 'forbidden',
      reason: projectDeny,
      requiredPermissions: candidate.requiredPermissions,
    };
  }

  // Project entity deep link: target project must be accessible (entityId).
  if (entityType === 'project' && entityId) {
    if (!context.accessibleProjectIds.has(entityId)) {
      return {
        status: 'forbidden',
        reason: 'You do not have access to this project',
        requiredPermissions: candidate.requiredPermissions,
      };
    }
  }

  const missing = candidate.requiredPermissions.filter(
    (permission) => !context.hasPermission(permission),
  );
  if (missing.length) {
    return {
      status: 'forbidden',
      reason: `Missing permission: ${missing.join(', ')}`,
      requiredPermissions: candidate.requiredPermissions,
    };
  }

  const switchProjectId =
    entityType === 'project' && entityId
      ? entityId
      : projectId && context.accessibleProjectIds.has(projectId)
        ? projectId
        : null;

  return {
    status: 'ok',
    target: candidate.target,
    requiredPermissions: candidate.requiredPermissions,
    projectId: switchProjectId,
  };
}
