import { useState } from 'react';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import type { SavedFilter, SavedFilterQuery } from './tablePreferences';

type Props = {
  presets: SavedFilter[];
  current: SavedFilterQuery;
  onSave: (name: string, query: SavedFilterQuery) => void;
  onApply: (query: SavedFilterQuery) => void;
  onRemove: (id: string) => void;
};

export function SavedFiltersControl({
  presets,
  current,
  onSave,
  onApply,
  onRemove,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');

  return (
    <>
      <Tooltip title="Saved filters">
        <IconButton
          size="small"
          aria-label="Saved filters"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <BookmarkBorderOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setDialogOpen(true);
          }}
        >
          Save current filters…
        </MenuItem>
        {presets.length === 0 ? (
          <MenuItem disabled>No saved filters</MenuItem>
        ) : (
          presets.map((preset) => (
            <MenuItem
              key={preset.id}
              onClick={() => {
                setAnchor(null);
                onApply(preset.query);
              }}
            >
              <ListItemText primary={preset.name} />
              <ListItemIcon sx={{ minWidth: 36, justifyContent: 'flex-end' }}>
                <IconButton
                  size="small"
                  aria-label={`Delete ${preset.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(preset.id);
                  }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />

                </IconButton>
              </ListItemIcon>
            </MenuItem>
          ))
        )}
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
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
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!name.trim()}
            onClick={() => {
              onSave(name, current);
              setName('');
              setDialogOpen(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
