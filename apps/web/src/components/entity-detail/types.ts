import type { ReactNode } from 'react';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import type { DomainStatusKey } from '@/status';

/**
 * Explicit action definition for entity detail screens.
 * Status allow-list is required — never infer from transitions alone.
 */
export type EntityDetailAction = {
  id: string;
  label: string;
  /** Permission required to show the action (hiding alone is not the guard). */
  permission: PermissionCode;
  /**
   * Exact workflow statuses where this action may appear.
   * Empty array means the action never shows (must be intentional).
   */
  allowedStatuses: readonly string[];
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning';
  disabled?: boolean;
  loading?: boolean;
};

export type EntitySummaryField = {
  id: string;
  label: string;
  value: ReactNode;
};

export type EntityDetailTab = {
  id: string;
  label: string;
  content: ReactNode;
  /** When set, tab is hidden unless the user has this permission. */
  permission?: PermissionCode;
};

export type EntityDetailHeaderProps = {
  title: string;
  /** Business code / document number. */
  code?: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  meta?: ReactNode;
};

export type StatusStripProps = {
  status: string;
  domainKey: DomainStatusKey;
  /** Extra chips (e.g. escalated, superseded). */
  badges?: readonly { id: string; label: string; color?: 'default' | 'warning' | 'error' | 'info' | 'success' }[];
  meta?: ReactNode;
};

export type EntityDetailLayoutProps = {
  /** Entity (or module) view permission already evaluated by the caller. */
  canView: boolean;
  /** Active project present when the screen is project-scoped. */
  projectReady?: boolean;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  notFound?: boolean;
  permissionTitle?: string;
  permissionMessage?: string;
  projectMissingTitle?: string;
  projectMissingDescription?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
  header?: ReactNode;
  statusStrip?: ReactNode;
  summary?: ReactNode;
  actionBar?: ReactNode;
  tabs?: ReactNode;
  timeline?: ReactNode;
  children?: ReactNode;
};
