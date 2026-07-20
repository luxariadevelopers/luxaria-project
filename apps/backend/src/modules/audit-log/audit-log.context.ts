import type { Request } from 'express';
import { REQUEST_ID_HEADER } from '../../common/middleware/request-id.middleware';

export const DEVICE_ID_HEADER = 'x-device-id';

export type AuditRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  deviceId: string | null;
};

function headerValue(
  headers: Request['headers'],
  name: string,
): string | null {
  const raw = headers[name];
  if (Array.isArray(raw)) {
    return raw[0]?.trim() || null;
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  return null;
}

/** Extract IP / UA / requestId / deviceId from an Express request. */
export function extractAuditRequestContext(
  request?: Request | null,
): AuditRequestContext {
  if (!request) {
    return {
      ipAddress: null,
      userAgent: null,
      requestId: null,
      deviceId: null,
    };
  }

  const forwarded = request.headers['x-forwarded-for'];
  const ipFromHeader = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0];

  return {
    ipAddress: ipFromHeader?.trim() || request.ip || null,
    userAgent: headerValue(request.headers, 'user-agent'),
    requestId: headerValue(request.headers, REQUEST_ID_HEADER),
    deviceId: headerValue(request.headers, DEVICE_ID_HEADER),
  };
}
