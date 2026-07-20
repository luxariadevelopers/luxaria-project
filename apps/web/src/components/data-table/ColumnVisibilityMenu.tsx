import { useState } from 'react';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import {
  Checkbox,
  FormControlLabel,
  IconButton,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';

type Props<R extends GridValidRowModel> = {
  columns: GridColDef<R>[];
  visibilityModel: Record<string, boolean>;
  onChange: (model: Record<string, boolean>) => void;
};

export function ColumnVisibilityMenu<R extends GridValidRowModel>({
  columns,
  visibilityModel,
  onChange,
}: Props<R>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const toggleable = columns.filter(
    (c) => c.field && c.field !== '__actions' && c.hideable !== false,
  );

  return (
    <>
      <Tooltip title="Columns">
        <IconButton
          size="small"
          aria-label="Toggle column visibility"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <ViewColumnOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { px: 1.5, py: 1, minWidth: 200 } } }}
      >
        <Typography variant="subtitle2" sx={{ px: 1, pb: 0.5 }}>
          Visible columns
        </Typography>
        <Stack>
          {toggleable.map((col) => {
            const visible = visibilityModel[col.field] !== false;
            return (
              <FormControlLabel
                key={col.field}
                sx={{ mx: 0, px: 1 }}
                control={
                  <Checkbox
                    size="small"
                    checked={visible}
                    onChange={(_, checked) =>
                      onChange({ ...visibilityModel, [col.field]: checked })
                    }
                  />
                }
                label={col.headerName ?? col.field}
              />
            );
          })}
        </Stack>
      </Menu>
    </>
  );
}
