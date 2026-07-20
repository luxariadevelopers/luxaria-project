import { useState } from 'react';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import type { SavedFilter, SavedFilterQuery } from './tablePreferences';

export type TableSettingsPanelProps<R extends GridValidRowModel> = {
  columns: GridColDef<R>[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (model: Record<string, boolean>) => void;
  savedFilters: SavedFilter[];
  currentQuery: SavedFilterQuery;
  onSaveFilter: (name: string, query: SavedFilterQuery) => void;
  onApplyFilter: (query: SavedFilterQuery) => void;
  onRemoveFilter: (id: string) => void;
  onReset: () => void;
};

/**
 * Reusable table settings panel: saved filters, column preferences, reset.
 */
export function TableSettingsPanel<R extends GridValidRowModel>({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  savedFilters,
  currentQuery,
  onSaveFilter,
  onApplyFilter,
  onRemoveFilter,
  onReset,
}: TableSettingsPanelProps<R>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [name, setName] = useState('');
  const [section, setSection] = useState<'main' | 'columns' | 'filters'>('main');

  const toggleable = columns.filter(
    (c) => c.field && c.field !== '__actions' && c.hideable !== false,
  );

  const close = () => {
    setAnchor(null);
    setSection('main');
  };

  return (
    <>
      <Tooltip title="Table settings">
        <IconButton
          size="small"
          aria-label="Table settings"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        {section === 'main' ? (
          <Box>
            <MenuItem onClick={() => setSection('filters')}>
              <ListItemIcon>
                <BookmarkBorderOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Saved filters"
                secondary={
                  savedFilters.length
                    ? `${savedFilters.length} saved`
                    : 'None saved'
                }
              />
            </MenuItem>
            <MenuItem onClick={() => setSection('columns')}>
              <ListItemIcon>
                <ViewColumnOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Column preferences" />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                setAnchor(null);
                setResetOpen(true);
              }}
            >
              <ListItemIcon>
                <RestartAltOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Reset table preferences" />
            </MenuItem>
          </Box>
        ) : null}

        {section === 'filters' ? (
          <Box>
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Typography variant="subtitle2">Saved filters</Typography>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchor(null);
                setSection('main');
                setSaveOpen(true);
              }}
            >
              Save current filters…
            </MenuItem>
            {savedFilters.length === 0 ? (
              <MenuItem disabled>No saved filters</MenuItem>
            ) : (
              savedFilters.map((preset) => (
                <MenuItem
                  key={preset.id}
                  onClick={() => {
                    close();
                    onApplyFilter(preset.query);
                  }}
                >
                  <ListItemText primary={preset.name} />
                  <ListItemIcon
                    sx={{ minWidth: 36, justifyContent: 'flex-end' }}
                  >
                    <IconButton
                      size="small"
                      aria-label={`Delete ${preset.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFilter(preset.id);
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </ListItemIcon>
                </MenuItem>
              ))
            )}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => setSection('main')}>Back</MenuItem>
          </Box>
        ) : null}

        {section === 'columns' ? (
          <Box sx={{ px: 1.5, py: 1, maxWidth: 280 }}>
            <Typography variant="subtitle2" sx={{ px: 1, pb: 0.5 }}>
              Visible columns
            </Typography>
            <Stack>
              {toggleable.map((col) => {
                const visible = columnVisibility[col.field] !== false;
                return (
                  <FormControlLabel
                    key={col.field}
                    sx={{ mx: 0, px: 1 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={visible}
                        onChange={(_, checked) =>
                          onColumnVisibilityChange({
                            ...columnVisibility,
                            [col.field]: checked,
                          })
                        }
                      />
                    }
                    label={col.headerName ?? col.field}
                  />
                );
              })}
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Button size="small" onClick={() => setSection('main')}>
              Back
            </Button>
          </Box>
        ) : null}
      </Menu>

      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save filters</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!name.trim()}
            onClick={() => {
              onSaveFilter(name, currentQuery);
              setName('');
              setSaveOpen(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset table preferences?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Clears saved filters, column visibility, and remembered page size
            for this list. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onReset();
              setResetOpen(false);
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
