import type { DrillDownLink } from './types';

export type ResolvedDrillDown = {
  label: string;
  to: string;
};

type DrillRule = {
  apiPrefix: string;
  path: string;
};

/** Map backend `/api/v1/...` drill-down hrefs to shipped portal routes. */
const DRILL_DOWN_RULES: readonly DrillRule[] = [
  { apiPrefix: '/api/v1/purchase-orders', path: '/procurement/purchase-orders' },
  { apiPrefix: '/api/v1/vendor-invoices', path: '/vendors' },
  { apiPrefix: '/api/v1/projects', path: '/projects' },
  { apiPrefix: '/api/v1/boq/projects', path: '/project-control/boq' },
  {
    apiPrefix: '/api/v1/accounting-reports/general-ledger',
    path: '/accounting/journals',
  },
  {
    apiPrefix: '/api/v1/construction-reports/boq-budget-vs-actual',
    path: '/project-control/cost-forecast',
  },
] as const;

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

function resolveOne(link: DrillDownLink): ResolvedDrillDown | null {
  const href = stripApiPrefix(link.href);
  const rule = DRILL_DOWN_RULES.find((r) => href.startsWith(r.apiPrefix));
  if (!rule) {
    return null;
  }
  const query = href.includes('?') ? href.slice(href.indexOf('?')) : '';
  return {
    label: link.label,
    to: `${rule.path}${query}`,
  };
}

export function resolveDrillDownLinks(
  links: readonly DrillDownLink[],
): ResolvedDrillDown[] {
  const out: ResolvedDrillDown[] = [];
  for (const link of links) {
    const resolved = resolveOne(link);
    if (resolved) {
      out.push(resolved);
    }
  }
  return out;
}

/** Prefer the general-ledger drill-down on a cost-sheet row when present. */
export function pickPrimaryDrillDown(
  links: readonly DrillDownLink[],
): ResolvedDrillDown | null {
  const resolved = resolveDrillDownLinks(links);
  return (
    resolved.find((l) => l.to.startsWith('/accounting/journals')) ??
    resolved[0] ??
    null
  );
}
