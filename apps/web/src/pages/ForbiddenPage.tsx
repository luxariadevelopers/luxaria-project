import { PermissionDenied } from '@/components/errors';

export function ForbiddenPage() {
  return (
    <PermissionDenied
      showHomeLink
      title="Access denied"
      message="Access denied. Contact MD"
    />
  );
}
