/**
 * Shared display tokens for status badges (web Chip / mobile tag map to these).
 */
export type StatusBadgeVariant =
  | 'neutral'
  | 'info'
  | 'warning'
  | 'success'
  | 'danger'
  | 'muted';

export type StatusDisplay = {
  /** Raw status string from the API (may be unknown). */
  value: string;
  known: boolean;
  label: string;
  badgeVariant: StatusBadgeVariant;
};

export type StatusCatalogDefinition<T extends string> = {
  values: readonly T[];
  labels: Record<T, string>;
  badgeVariants: Record<T, StatusBadgeVariant>;
  /**
   * Allowed next statuses derived from backend service/validation rules.
   * Empty array = terminal for UI transition helpers.
   */
  transitions: Record<T, readonly T[]>;
  /** Statuses where document body remains editable (when backend defines this). */
  editable?: readonly T[];
  /** Explicitly immutable / non-editable statuses (posted, paid, etc.). */
  immutable?: readonly T[];
};

export type StatusCatalog<T extends string> = {
  readonly values: readonly T[];
  isKnown(status: string): status is T;
  parse(status: string): T | null;
  label(status: string, fallback?: string): string;
  badgeVariant(status: string): StatusBadgeVariant;
  display(status: string, fallbackLabel?: string): StatusDisplay;
  canTransition(from: string, to: string): boolean;
  allowedTransitions(from: string): readonly T[];
  isEditable(status: string): boolean;
  isImmutable(status: string): boolean;
};
