import { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import type { GridValidRowModel } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import type { DataTableRowAction } from './types';

type Props<R extends GridValidRowModel> = {
  row: R;
  actions: readonly DataTableRowAction<R>[];
};

export function RowActionsMenu<R extends GridValidRowModel>({
  row,
  actions,
}: Props<R>) {
  const { hasPermission } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const visible = actions.filter(
    (action) => !action.permission || hasPermission(action.permission),
  );

  if (visible.length === 0) {
    return null;
  }

  return (
    <>
      <IconButton
        size="small"
        aria-label="Row actions"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        {visible.map((action) => (
          <MenuItem
            key={action.id}
            disabled={action.disabled?.(row) ?? false}
            onClick={() => {
              setAnchor(null);
              action.onClick(row);
            }}
            sx={action.danger ? { color: 'error.main' } : undefined}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
