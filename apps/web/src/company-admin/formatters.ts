import { resolveUploadsUrl } from '@/print-pdf/resolveUploadsUrl';
import type { CompanyAddress } from './types';

export function formatCompanyAddress(address: CompanyAddress): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * The mapper may return either an absolute logo URL or the backend's relative
 * storage path. Rooting a relative path keeps it on the current deployment
 * origin (normally reverse-proxied to the API).
 */
export function resolveCompanyLogoUrl(logo: string | null | undefined): string | null {
  const value = logo?.trim();
  if (!value) return null;
  if (/^(?:https?:|data:|blob:)/i.test(value)) {
    return value;
  }
  return resolveUploadsUrl(value);
}
