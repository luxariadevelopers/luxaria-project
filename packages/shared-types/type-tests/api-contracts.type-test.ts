/**
 * Compile-time contract tests for shared API envelopes (Micro Phase 002).
 * Run via: `pnpm --filter @luxaria/shared-types test`
 */

import { ERROR_CODES } from '../src/index';
import type {
  ApiError,
  ApiErrorDetail,
  ApiResponse,
  ApiResult,
  AuditMeta,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  SelectOption,
} from '../src/index';

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type _SuccessLiteral = Expect<Equal<ApiResponse<number>['success'], true>>;
type _ErrorLiteral = Expect<Equal<ApiError['success'], false>>;

type _ResponseHasOptionalData = Expect<
  Equal<ApiResponse<{ id: string }>['data'], { id: string } | undefined>
>;

type _ErrorDetails = Expect<
  Equal<ApiError['details'], ApiErrorDetail[]>
>;

type _ErrorCodePresent = Expect<
  Equal<(typeof ERROR_CODES)['FORBIDDEN'], 'FORBIDDEN'>
>;

// Keep ERROR_CODES as a runtime import for lint + value check.
const _forbiddenCode: 'FORBIDDEN' = ERROR_CODES.FORBIDDEN;

type _PaginationMetaShape = Expect<
  Equal<
    keyof PaginationMeta,
    | 'page'
    | 'limit'
    | 'total'
    | 'totalPages'
    | 'hasNextPage'
    | 'hasPrevPage'
  >
>;

type _PaginatedDataIsArray = Expect<
  Equal<PaginatedResponse<{ id: string }>['data'], { id: string }[] | undefined>
>;

type _PaginatedMetaRequired = Expect<
  Equal<PaginatedResponse<string>['meta']['page'], number>
>;

type _SelectOptionValue = Expect<
  Equal<SelectOption['value'], string | number>
>;

type _AuditNullability = Expect<
  Equal<AuditMeta['createdBy'], string | null | undefined>
>;

type _AuditDeletedAt = Expect<
  Equal<AuditMeta['deletedAt'], string | null | undefined>
>;

type _PaginationQuerySort = Expect<
  Equal<PaginationQuery['sortOrder'], 'asc' | 'desc' | undefined>
>;

type _ResultDiscriminant = Expect<
  Equal<ApiResult<number>['success'], true | false>
>;

/** Runtime no-op so the file is a valid module for tsc. */
export const apiContractTypeTestsOk = true as const;
void _forbiddenCode;

// Force referenced types so unused-type lint/tsc keep them.
void (true as _SuccessLiteral);
void (true as _ErrorLiteral);
void (true as _ResponseHasOptionalData);
void (true as _ErrorDetails);
void (true as _ErrorCodePresent);
void (true as _PaginationMetaShape);
void (true as _PaginatedDataIsArray);
void (true as _PaginatedMetaRequired);
void (true as _SelectOptionValue);
void (true as _AuditNullability);
void (true as _AuditDeletedAt);
void (true as _PaginationQuerySort);
void (true as _ResultDiscriminant);
