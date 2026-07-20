import { SetMetadata } from '@nestjs/common';
import type { ProjectAccessOperation } from '../schemas/unauthorized-project-access.schema';

/** Metadata key for explicit route scope classification (R-003 default-deny). */
export const ROUTE_SCOPE_KEY = 'routeScope';

export type RouteScopeKind =
  | 'public'
  | 'global'
  | 'project'
  | 'investor'
  | 'system'
  | 'webhook';

export type ProjectIdSource = 'params' | 'query' | 'body' | 'header';

export type ProjectIdLocator = {
  source: ProjectIdSource;
  /** Field or header name. Headers are matched case-insensitively. */
  key: string;
};

export type ResourceOwnershipLocator = {
  /** Request param/query/body key holding the resource id (default: id). */
  idParam?: string;
  /** Where to read the resource id from (default: params). */
  idSource?: 'params' | 'query' | 'body';
  /** Registered resource type for ownership lookup. */
  resourceType: string;
};

/**
 * Project-scoped resolution:
 * - `single` — resolve one projectId and assert membership (default).
 * - `filter` — allow when actor has any project access; attach authorised set.
 *   If a projectId is supplied, that specific project is asserted.
 */
export type ProjectScopeMode = 'single' | 'filter';

export type RouteScopeMetadata = {
  kind: RouteScopeKind;
  operation?: ProjectAccessOperation;
  mode?: ProjectScopeMode;
  /**
   * Explicit projectId locators. When omitted for project/investor scopes,
   * defaults to params/query/body `projectId` + header `x-project-id`.
   */
  projectIdKeys?: ProjectIdLocator[];
  /** Server-side ownership lookup for resource-by-id routes. */
  resource?: ResourceOwnershipLocator;
  /**
   * When false in `single` mode, missing project id skips assert
   * (legacy optional filters). Prefer `filter` mode for lists.
   */
  required?: boolean;
  /**
   * Elevated cross-project administrative access.
   * Requires an explicit permission code in addition to RBAC on the route.
   */
  elevatedPermission?: string;
};

export const DEFAULT_PROJECT_ID_LOCATORS: ProjectIdLocator[] = [
  { source: 'params', key: 'projectId' },
  { source: 'query', key: 'projectId' },
  { source: 'body', key: 'projectId' },
  { source: 'header', key: 'x-project-id' },
];

/** Company / master-data / admin routes that are not project-isolated. */
export const GlobalScope = () =>
  SetMetadata(ROUTE_SCOPE_KEY, { kind: 'global' } satisfies RouteScopeMetadata);

/** Authenticated project-scoped business routes (default-deny when unresolved). */
export const ProjectScoped = (
  options: Omit<RouteScopeMetadata, 'kind'> = {},
) =>
  SetMetadata(ROUTE_SCOPE_KEY, {
    kind: 'project',
    operation: options.operation ?? 'read',
    mode: options.mode ?? 'single',
    projectIdKeys: options.projectIdKeys,
    resource: options.resource,
    required: options.required ?? true,
    elevatedPermission: options.elevatedPermission,
  } satisfies RouteScopeMetadata);

/** Investor portal routes — participation + party ownership, not staff assignment alone. */
export const InvestorScoped = (
  options: Omit<RouteScopeMetadata, 'kind'> = {},
) =>
  SetMetadata(ROUTE_SCOPE_KEY, {
    kind: 'investor',
    operation: options.operation ?? 'read',
    mode: options.mode ?? 'single',
    projectIdKeys: options.projectIdKeys,
    resource: options.resource,
    required: options.required ?? true,
  } satisfies RouteScopeMetadata);

/** Internal system HTTP surfaces (health internals, diagnostics). */
export const SystemInternal = () =>
  SetMetadata(ROUTE_SCOPE_KEY, { kind: 'system' } satisfies RouteScopeMetadata);

/** External webhook ingress — must resolve ownership server-side. */
export const WebhookRoute = () =>
  SetMetadata(ROUTE_SCOPE_KEY, { kind: 'webhook' } satisfies RouteScopeMetadata);
