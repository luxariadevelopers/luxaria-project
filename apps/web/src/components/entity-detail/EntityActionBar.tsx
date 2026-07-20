import { useMemo } from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import {
  assertActionAllowed,
  resolveVisibleActions,
} from './resolveActions';
import type { EntityDetailAction } from './types';

type Props = {
  actions: readonly EntityDetailAction[];
  /** Current workflow status — used with each action's explicit allow-list. */
  status: string;
  hasPermission: (code: PermissionCode) => boolean;
  /** Optional note shown when no actions resolve (status + permission). */
  emptyHint?: string;
};

/**
 * Primary/secondary actions for a detail screen.
 * Only renders actions that pass both permission and status allow-list;
 * click handler re-checks before invoking (status races).
 */
export function EntityActionBar({
  actions,
  status,
  hasPermission,
  emptyHint = 'No actions available for this status and your permissions.',
}: Props) {
  const visible = useMemo(
    () => resolveVisibleActions(actions, { status, hasPermission }),
    [actions, status, hasPermission],
  );

  if (visible.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        data-testid="entity-action-bar-empty"
      >
        {emptyHint}
      </Typography>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      data-testid="entity-action-bar"
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        py: 1.5,
        px: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      {visible.map((action) => (
        <Button
          key={action.id}
          size="small"
          variant={action.variant ?? 'outlined'}
          color={action.color ?? 'primary'}
          disabled={action.disabled || action.loading}
          onClick={() => {
            if (
              !assertActionAllowed(action, {
                status,
                hasPermission,
              })
            ) {
              return;
            }
            action.onClick();
          }}
        >
          {action.loading ? (
            <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" />
          ) : null}
          {action.label}
        </Button>
      ))}
    </Stack>
  );
}
