import { DPR_ROUTES } from '@/dpr/routes';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import type { DrillDownLink } from './types';

export type ResolvedDrillDown = {
  label: string;
  to: string;
};

type DrillRule = {
  /** Prefix of backend `drillDown.href` (always `/api/v1/...`). */
  apiPrefix: string;
  /** Shipped portal path from the route registry. */
  path: string;
  anyOf: readonly PermissionCode[];
};

/**
 * Only map API drill-downs to routes that already exist in the web app.
 * Unknown / unshipped modules stay non-navigable (label only).
 */
export const DRILL_DOWN_RULES: readonly DrillRule[] = [
  {
    apiPrefix: '/api/v1/purchase-requests',
    path: '/procurement/purchase-requests',
    anyOf: ['purchase.view'],
  },
  {
    apiPrefix: '/api/v1/purchase-orders',
    path: '/procurement/purchase-orders',
    anyOf: ['purchase.view'],
  },
  {
    apiPrefix: '/api/v1/daily-progress-reports',
    path: DPR_ROUTES.list,
    anyOf: ['dpr.view'],
  },
  {
    apiPrefix: '/api/v1/projects',
    path: '/projects',
    anyOf: ['project.view'],
  },
  {
    apiPrefix: '/api/v1/contractors',
    path: '/contractors',
    anyOf: ['contractor.view'],
  },
  {
    apiPrefix: '/api/v1/vendors',
    path: '/vendors',
    anyOf: ['vendor.view'],
  },
  {
    apiPrefix: '/api/v1/vendor-invoices',
    path: '/vendors',
    anyOf: ['vendor.view'],
  },
  {
    apiPrefix: '/api/v1/customer-receipts',
    path: '/customers',
    anyOf: ['customer.view'],
  },
  {
    apiPrefix: '/api/v1/customers',
    path: '/customers',
    anyOf: ['customer.view'],
  },
] as const;

export type DrillDownContext = {
  hasAnyPermission: (permissions: string[]) => boolean;
};

function stripApiPrefix(href: string): string {
  const trimmed = href.trim();
  if (trimmed.startsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.startsWith('api/v1')) {
    return `/${trimmed}`;
  }
  return trimmed;
}

function matchRule(href: string): DrillRule | undefined {
  const normalised = stripApiPrefix(href);
  return DRILL_DOWN_RULES.find(
    (rule) =>
      normalised === rule.apiPrefix ||
      normalised.startsWith(`${rule.apiPrefix}?`) ||
      normalised.startsWith(`${rule.apiPrefix}/`),
  );
}

/**
 * Resolve a backend drill-down href to a portal path when the module is
 * shipped and the user has view permission. Returns null otherwise.
 */
export function resolveDrillDownLink(
  link: DrillDownLink,
  ctx: DrillDownContext,
): ResolvedDrillDown | null {
  const rule = matchRule(link.href);
  if (!rule) {
    return null;
  }
  if (!ctx.hasAnyPermission([...rule.anyOf])) {
    return null;
  }
  return { label: link.label, to: rule.path };
}

export function resolveDrillDownLinks(
  links: readonly DrillDownLink[],
  ctx: DrillDownContext,
): ResolvedDrillDown[] {
  const out: ResolvedDrillDown[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const resolved = resolveDrillDownLink(link, ctx);
    if (!resolved || seen.has(resolved.to)) {
      continue;
    }
    seen.add(resolved.to);
    out.push(resolved);
  }
  return out;
}
