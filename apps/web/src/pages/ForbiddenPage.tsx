import { PermissionDenied } from '@/components/errors';

export function ForbiddenPage() {
  return <PermissionDenied showHomeLink />;
}
