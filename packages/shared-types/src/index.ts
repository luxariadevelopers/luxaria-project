/**
 * Shared TypeScript contracts for Luxaria Developers ERP.
 * Phase 002: API envelopes. Phase 003: domain workflow statuses.
 * Phase 006: normalised API / network error helpers.
 * Phase 009: document upload types + private S3 workflow helper.
 * Phase 010: project access scope + selection helpers.
 * Phase 016: workflow timeline normalisation (approval + audit history).
 */

export type { AppName, HealthStatus } from './app';
export type {
  ApiError,
  ApiErrorBody,
  ApiErrorDetail,
  ApiResponse,
  ApiResult,
  ApiSuccessResponse,
  AppErrorInput,
  AppErrorKind,
  AuditMeta,
  ErrorCode,
  NormalizedAppError,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  SelectOption,
  SortOrder,
} from './api';
export {
  ERROR_CODES,
  buildFieldErrors,
  getUserErrorMessage,
  inferFieldFromDetailMessage,
  isForbiddenErrorKind,
  isUnauthorizedError,
  normalizeAppError,
  sanitizeErrorMessage,
} from './api';

export {
  DOCUMENT_TYPE_REGEX,
  DocumentStatus,
  MalwareScanStatus,
  assertDocumentType,
  executeDocumentUpload,
  isConfirmedDocumentStatus,
} from './documents';
export type {
  ConfirmUploadRequest,
  DocumentUploadAdapters,
  DocumentUploadContext,
  DocumentUploadProgress,
  ListDocumentsQuery,
  LocalUploadFile,
  PresignDownloadResult,
  PresignUploadRequest,
  PresignUploadResult,
  PublicDocument,
} from './documents';


export type {
  StatusBadgeVariant,
  StatusCatalog,
  StatusCatalogDefinition,
  StatusDisplay,
  DomainStatusKey,
  ApprovalStatusType,
  JournalStatusType,
  PurchaseRequestStatusType,
  PurchaseOrderStatusType,
  GoodsReceiptStatusType,
  VendorInvoiceStatusType,
  VendorInvoiceMatchingStatusType,
  SiteExpenseVoucherStatusType,
  SignedPaymentVoucherStatusType,
  BookingStatusType,
  ContractorBillStatusType,
} from './status';
export {
  createStatusCatalog,
  ApprovalStatus,
  approvalStatusCatalog,
  JournalStatus,
  journalStatusCatalog,
  PurchaseRequestStatus,
  purchaseRequestStatusCatalog,
  PurchaseOrderStatus,
  purchaseOrderStatusCatalog,
  GoodsReceiptStatus,
  goodsReceiptStatusCatalog,
  VendorInvoiceStatus,
  VendorInvoiceMatchingStatus,
  vendorInvoiceStatusCatalog,
  vendorInvoiceMatchingStatusCatalog,
  SiteExpenseVoucherStatus,
  siteExpenseVoucherStatusCatalog,
  SignedPaymentVoucherStatus,
  signedPaymentVoucherStatusCatalog,
  BookingStatus,
  ACTIVE_BOOKING_STATUSES,
  BOOKING_WORKFLOW_PROGRESSION,
  bookingStatusCatalog,
  ContractorBillStatus,
  EDITABLE_CONTRACTOR_BILL_STATUSES,
  contractorBillStatusCatalog,
  DOMAIN_STATUS_CATALOGS,
  getDomainStatusCatalog,
  getDomainStatusDisplay,
  getDomainStatusLabel,
} from './status';

export {
  PROJECT_ACCESS_ME_QUERY_KEY,
  PROJECTS_SELECTOR_QUERY_KEY,
  ProjectStatus,
  SELECTABLE_PROJECT_STATUSES,
  filterSelectableProjects,
  isProjectInAccessScope,
  isSelectableProjectStatus,
  projectScopedQueryKey,
  resolveProjectSelection,
  shouldPreserveQueryOnProjectSwitch,
} from './project';
export type {
  ProjectAccessScope,
  ProjectOption,
  ProjectSelectionIssue,
  ProjectStatusType,
  ResolveProjectSelectionInput,
  ResolveProjectSelectionResult,
} from './project';

export {
  APPROVAL_HISTORY_ACTIONS,
  AUDIT_ACTIONS,
  ApprovalHistoryAction,
  AuditAction,
  impliedApprovalStatusAfterAction,
  isApprovalHistoryAction,
  isAuditAction,
  labelTimelineAction,
  mergeTimelineEvents,
  normalizeApprovalHistorySnapshots,
  normalizeApprovalTimelineEntries,
  normalizeAuditLogEntries,
  normalizeLegacyTimelineEvents,
  sortTimelineEvents,
} from './workflow-timeline';
export type {
  ApprovalHistoryActionType,
  ApprovalTimelinePayload,
  AuditActionType,
  LegacyTimelineEventInput,
  NormalizeTimelineOptions,
  PublicApprovalHistorySnapshot,
  PublicApprovalTimelineEntry,
  PublicAuditLogEntry,
  WorkflowTimelineActor,
  WorkflowTimelineDocumentRef,
  WorkflowTimelineEvent,
  WorkflowTimelineEventKind,
  WorkflowTimelineEventSource,
  WorkflowTimelineStatusTransition,
} from './workflow-timeline';
