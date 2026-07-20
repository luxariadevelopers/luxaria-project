import { ERROR_CODES, type ApiError } from '@luxaria/shared-types';
import axios from 'axios';
import { isForbiddenError } from '@/api/client';

/** Allowed investor self-service API prefix (never staff `/investors`). */
export const INVESTOR_PORTAL_API_PREFIX = '/investor-portal';

/** Staff CRM / capital module — blocked from investor portal clients. */
export const STAFF_INVESTOR_API_PREFIX = '/investors';

export class InvestorPortalApiPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestorPortalApiPathError';
  }
}

/**
 * Ensures the client only calls investor-portal endpoints.
 * Throws before any network request when a staff investor path is used.
 */
export function assertInvestorPortalApiPath(path: string): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized.startsWith(STAFF_INVESTOR_API_PREFIX)) {
    throw new InvestorPortalApiPathError(
      `Staff investor API blocked in portal client: ${normalized}`,
    );
  }

  if (!normalized.startsWith(INVESTOR_PORTAL_API_PREFIX)) {
    throw new InvestorPortalApiPathError(
      `Only investor-portal APIs are allowed in portal client: ${normalized}`,
    );
  }
}

/** True when backend denied horizontal access to a project (403). */
export function isProjectAccessDenied(error: unknown): boolean {
  return isForbiddenError(error);
}

/** True for any investor-portal permission / scope denial. */
export function isInvestorPortalForbidden(error: unknown): boolean {
  return isForbiddenError(error);
}

export function getInvestorAccessDeniedMessage(
  error: unknown,
  fallback = 'You do not have access to this project.',
): string {
  if (isInvestorPortalForbidden(error)) {
    return fallback;
  }
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

/** Client-side guard before navigating to a project the list did not return. */
export function isProjectAuthorised(
  projectId: string,
  authorisedProjectIds: readonly string[],
): boolean {
  if (!projectId) {
    return false;
  }
  return authorisedProjectIds.includes(projectId);
}

/** Maps axios 403 + FORBIDDEN error code for test fixtures. */
export function createForbiddenError(message = 'Forbidden'): Error {
  return new axios.AxiosError(
    message,
    '403',
    undefined,
    undefined,
    {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: {} } as never,
      data: {
        success: false,
        errorCode: ERROR_CODES.FORBIDDEN,
        message,
        details: [],
        requestId: 'test',
        timestamp: new Date().toISOString(),
      },
    },
  );
}
