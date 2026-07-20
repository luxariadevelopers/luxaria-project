import type { PermissionCode } from '@/navigation/permissionCatalog';

/** Formats actually returned by Nest export routes. */
export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export type ExportFieldOption = {
  id: string;
  label: string;
  /** Default selected when dialog opens. */
  defaultSelected?: boolean;
};

export type ExportFilterKey =
  | 'from'
  | 'to'
  | 'date'
  | 'projectId'
  | 'financialYearId'
  | 'accountId'
  | 'partyId'
  | 'contractorId'
  | 'vendorId'
  | 'materialId'
  | 'horizonDays';

export type ExportRequiredFilter = {
  key: ExportFilterKey;
  label: string;
};

export type ExportFormValues = {
  format: ExportFormat;
  from: string;
  to: string;
  date: string;
  projectId: string;
  financialYearId: string;
  accountId: string;
  partyId: string;
  contractorId: string;
  vendorId: string;
  materialId: string;
  horizonDays: string;
  selectedFieldIds: string[];
};

/**
 * Descriptor for `ExportDialog`.
 * `fetchBinary` must call an existing Nest export route (or client CSV builder).
 */
export type ExportDescriptor = {
  id: string;
  title: string;
  /**
   * Permission checked in the dialog (`report.export` or module export e.g. `boq.view`).
   * Omit when the parent already gated access (client table CSV).
   */
  permission?: PermissionCode;
  allowedFormats: readonly ExportFormat[];
  defaultFormat: ExportFormat;
  /** Show from/to date inputs. */
  showDateRange?: boolean;
  /** Show single as-of `date` (finance dashboard). */
  showAsOfDate?: boolean;
  /** Show horizonDays (finance dashboard; max 180). */
  showHorizonDays?: boolean;
  /**
   * Inclusive max days for from→to when both set.
   * Only set when the product rule is known; accounting APIs do not define a max.
   */
  maxRangeDays?: number;
  requiredFilters?: readonly ExportRequiredFilter[];
  /** Optional filter inputs shown (beyond required). */
  optionalFilters?: readonly ExportRequiredFilter[];
  /** Column/field selection (client table export, or UI-only notes). */
  fields?: readonly ExportFieldOption[];
  /** Require ≥1 field when `fields` is non-empty. */
  requireFieldSelection?: boolean;
  /**
   * Build + fetch the binary. Receives validated form values.
   * Must throw on API failure (including parsed blob JSON errors).
   */
  fetchBinary: (values: ExportFormValues) => Promise<{
    blob: Blob;
    filename: string;
    contentType: string;
  }>;
  /** Fallback filename stem when Content-Disposition is missing (CORS). */
  fallbackFilename: string;
};

export type ExportValidationResult =
  | { ok: true; values: ExportFormValues }
  | { ok: false; message: string; fieldErrors?: Partial<Record<keyof ExportFormValues, string>> };
