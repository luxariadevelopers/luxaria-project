/**
 * Web-local auth/domain types. Common API envelopes live in `@luxaria/shared-types`.
 */
export type {
  ApiError,
  ApiErrorBody,
  ApiErrorDetail,
  ApiResponse,
  ApiResult,
  ApiSuccessResponse,
  AuditMeta,
  ErrorCode,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  SelectOption,
  SortOrder,
} from '@luxaria/shared-types';
export { ERROR_CODES } from '@luxaria/shared-types';

export type AuthUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  status: string;
  /** Authoritative tenant resolved by the backend; never user-editable. */
  companyId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: string;
};

export type UserAccess = {
  userId: string;
  roleIds: string[];
  roleCodes: string[];
  permissions: string[];
  bypassPermissions: boolean;
};

export type { ProjectAccessScope, ProjectOption } from '@luxaria/shared-types';
