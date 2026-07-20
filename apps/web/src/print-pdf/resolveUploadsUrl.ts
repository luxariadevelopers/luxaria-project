/**
 * Resolve a backend-relative filesystem path (`uploads/…`) to a browser URL.
 *
 * Path-based PDFs (PO / customer receipt export) are written under `uploads/`
 * by Nest; there is no authenticated download route for those files.
 * Deployments that reverse-proxy `/uploads` (or set `VITE_UPLOADS_BASE_URL`)
 * can open the file; otherwise open will fail at the network layer.
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
