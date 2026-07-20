import { Link as RouterLink } from 'react-router-dom';
import { Badge, IconButton, Tooltip } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { usePendingApprovalCount } from './useApprovals';

/**
 * Header badge for pending approvals on the active project.
 * Count from `GET /projects/:projectId/approvals?status=pending&page=1&limit=1`
 * → `meta.total` (no dedicated count endpoint).
 */
export function ApprovalsBadge() {
  const { hasPermission, access } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = !access || hasPermission('approval.view');

  const countQuery = usePendingApprovalCount(
    selectedProjectId,
    canView && Boolean(selectedProjectId),
  );

  if (!canView) {
    return null;
  }

  const count = selectedProjectId ? (countQuery.data ?? 0) : 0;
  const title = !selectedProjectId
    ? 'Select a project to see pending approvals'
    : count === 0
      ? 'No pending approvals'
      : `${count} pending approval${count === 1 ? '' : 's'}`;

  return (
    <Tooltip title={title}>
      <IconButton
        component={RouterLink}
        to="/approvals"
        aria-label="Open approvals inbox"
        size="small"
      >
        <Badge
          color="warning"
          badgeContent={count > 99 ? '99+' : count}
          invisible={count === 0}
        >
          <FactCheckOutlinedIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
