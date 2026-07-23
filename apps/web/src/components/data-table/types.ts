import type { ReactNode } from 'react';
import type {
  DataGridProps,
  GridColDef,
  GridRowSelectionModel,
  GridValidRowModel,
} from '@mui/x-data-grid';
import type { SortOrder } from '@luxaria/shared-types';

export type DataTableRowAction<R extends GridValidRowModel> = {
  id: string;
  label: string;
  onClick: (row: R) => void;
  /** Hide when the current user lacks this permission. */
  permission?: string;
  danger?: boolean;
  disabled?: (row: R) => boolean;
};

/**
 * Narrow-viewport card layout for DataTable (below `sm`).
 * When omitted, fields are inferred from columns (first = primary,
 * next two non-status = meta, `*status*` = chip).
 */
export type DataTableMobileCardConfig = {
  primaryField?: string;
  /** Up to two secondary fields shown under the primary label. */
  metaFields?: readonly string[];
  statusField?: string;
  /** Force spreadsheet layout on all breakpoints. */
  disabled?: boolean;
};

export type DataTableProps<R extends GridValidRowModel> = {
  title?: string;
  rows: readonly R[];
  columns: GridColDef<R>[];
  loading?: boolean;
  /** When set, shows RetryPanel instead of the grid. */
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  height?: number | string;
  getRowId?: DataGridProps<R>['getRowId'];
  onRowClick?: DataGridProps<R>['onRowClick'];

  /** `server` aligns with Nest `page`/`limit`/`sortBy`/`sortOrder`. */
  paginationMode?: 'client' | 'server';
  /** 1-based page (backend convention). */
  page?: number;
  pageSize?: number;
  /** Total row count for server pagination. */
  rowCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];

  sortingMode?: 'client' | 'server';
  sortBy?: string;
  sortOrder?: SortOrder;
  /** Unsupported keys are ignored when changing sort from the grid. */
  allowedSortKeys?: readonly string[];
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;

  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (search: string) => void;

  /** Extra filter controls rendered in the toolbar. */
  filterSlot?: ReactNode;
  /**
   * localStorage scope for table preferences (saved filters, columns, page size).
   * Alias: prefer this name for Phase 018; `savedFiltersKey` remains supported.
   */
  preferencesKey?: string;
  /** @deprecated Use `preferencesKey`. */
  savedFiltersKey?: string;
  /** Only these filter keys may be persisted / restored from preferences. */
  allowedFilterKeys?: readonly string[];
  filterValues?: Record<string, string>;
  onApplySavedQuery?: (query: {
    search: string;
    filters: Record<string, string>;
    sortBy: string;
    sortOrder: SortOrder;
    limit: number;
  }) => void;
  /** Called after the user resets table preferences (e.g. clear list query). */
  onResetPreferences?: () => void;

  checkboxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: DataGridProps<R>['onRowSelectionModelChange'];

  rowActions?:
    | readonly DataTableRowAction<R>[]
    | ((row: R) => readonly DataTableRowAction<R>[]);
  toolbarActions?: ReactNode;

  showExport?: boolean;
  exportFileName?: string;
  /** Hide export when user lacks this permission. */
  exportPermission?: string;
  showColumnVisibility?: boolean;

  /**
   * Card/list row mapping for viewports below `sm`.
   * Defaults to auto-inferred columns when omitted.
   */
  mobileCard?: DataTableMobileCardConfig;
};
