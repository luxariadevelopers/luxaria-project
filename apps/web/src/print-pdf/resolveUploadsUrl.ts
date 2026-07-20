/**
 * Resolve a backend-relative filesystem path (`uploads/…`) to a browser URL.
 * Nest writes customer-receipt PDFs under `uploads/`; deployments may
 * reverse-proxy `/uploads` or set `VITE_UPLOADS_BASE_URL`.
 */
export function resolveUploadsUrl(relativePath: string): string {
  const cleaned = relativePath.replace(/^\//, '');
  const configured = import.meta.env.VITE_UPLOADS_BASE_URL?.replace(/\/$/, '');
  if (configured) {
    return `${configured}/${cleaned}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${cleaned}`;
  }
  return `/${cleaned}`;
}
