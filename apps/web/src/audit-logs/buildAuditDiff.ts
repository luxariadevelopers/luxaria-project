export type AuditDiffChange = 'added' | 'removed' | 'changed' | 'unchanged';

export type AuditDiffRow = {
  path: string;
  before: unknown;
  after: unknown;
  change: AuditDiffChange;
};

export type BuildAuditDiffOptions = {
  /** Max object depth to walk (default 6). */
  maxDepth?: number;
  /** Cap rows returned (default 200) — large payloads stay renderable. */
  maxEntries?: number;
  /** Include unchanged leaves (default false). */
  includeUnchanged?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  return stableStringify(a) === stableStringify(b);
}

/**
 * Flatten before/after snapshots into path-level rows for the viewer.
 * Truncates walk depth / row count so large JSON stays usable.
 */
export function buildAuditDiff(
  beforeData: Record<string, unknown> | null | undefined,
  afterData: Record<string, unknown> | null | undefined,
  options: BuildAuditDiffOptions = {},
): { rows: AuditDiffRow[]; truncated: boolean; totalPaths: number } {
  const maxDepth = options.maxDepth ?? 6;
  const maxEntries = options.maxEntries ?? 200;
  const includeUnchanged = options.includeUnchanged ?? false;

  const collected: AuditDiffRow[] = [];
  let totalPaths = 0;
  let truncated = false;

  const walk = (
    before: unknown,
    after: unknown,
    path: string,
    depth: number,
  ) => {
    if (truncated && collected.length >= maxEntries) {
      truncated = true;
      return;
    }

    const bothObjects = isPlainObject(before) && isPlainObject(after);
    const beforeObj = isPlainObject(before) ? before : null;
    const afterObj = isPlainObject(after) ? after : null;

    if ((bothObjects || beforeObj || afterObj) && depth < maxDepth) {
      const keys = new Set([
        ...Object.keys(beforeObj ?? {}),
        ...Object.keys(afterObj ?? {}),
      ]);
      for (const key of [...keys].sort()) {
        const nextPath = path ? `${path}.${key}` : key;
        walk(beforeObj?.[key], afterObj?.[key], nextPath, depth + 1);
        if (truncated) return;
      }
      return;
    }

    totalPaths += 1;
    let change: AuditDiffChange;
    if (before === undefined && after !== undefined) {
      change = 'added';
    } else if (before !== undefined && after === undefined) {
      change = 'removed';
    } else if (valuesEqual(before, after)) {
      change = 'unchanged';
    } else {
      change = 'changed';
    }

    if (change === 'unchanged' && !includeUnchanged) {
      return;
    }

    if (collected.length >= maxEntries) {
      truncated = true;
      return;
    }

    collected.push({
      path: path || '(root)',
      before: before === undefined ? undefined : before,
      after: after === undefined ? undefined : after,
      change,
    });
  };

  if (beforeData == null && afterData == null) {
    return { rows: [], truncated: false, totalPaths: 0 };
  }

  walk(beforeData ?? undefined, afterData ?? undefined, '', 0);

  // Depth exceeded: surface the whole subtree as one changed row.
  if (
    collected.length === 0 &&
    (beforeData != null || afterData != null) &&
    !valuesEqual(beforeData, afterData)
  ) {
    collected.push({
      path: '(root)',
      before: beforeData ?? undefined,
      after: afterData ?? undefined,
      change: 'changed',
    });
    totalPaths = 1;
  }

  return { rows: collected, truncated, totalPaths };
}

/** Pretty JSON for display; caps length for large payloads. */
export function formatAuditJson(
  value: unknown,
  maxChars = 4_000,
): { text: string; truncated: boolean } {
  if (value === undefined) {
    return { text: '—', truncated: false };
  }
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? 'null';
  } catch {
    text = String(value);
  }
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, maxChars)}\n… [truncated ${text.length - maxChars} chars]`,
    truncated: true,
  };
}
