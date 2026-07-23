import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { PermissionCatalogItem } from './types';

type Props = {
  catalog: readonly PermissionCatalogItem[];
  value: readonly string[];
  disabled?: boolean;
  onChange: (permissions: string[]) => void;
};

function moduleLabel(module: string): string {
  return module
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PermissionChecklist({
  catalog,
  value,
  disabled = false,
  onChange,
}: Props) {
  const [search, setSearch] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? catalog.filter(
          (permission) =>
            permission.code.toLowerCase().includes(term) ||
            permission.module.toLowerCase().includes(term) ||
            permission.action.toLowerCase().includes(term),
        )
      : catalog;
    const groups = new Map<string, PermissionCatalogItem[]>();
    for (const permission of filtered) {
      const items = groups.get(permission.module) ?? [];
      items.push(permission);
      groups.set(permission.module, items);
    }
    return [...groups.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [catalog, search]);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next].sort());
  };

  const setModule = (
    permissions: readonly PermissionCatalogItem[],
    checked: boolean,
  ) => {
    const next = new Set(selected);
    for (const permission of permissions) {
      if (checked) next.add(permission.code);
      else next.delete(permission.code);
    }
    onChange([...next].sort());
  };

  const visiblePermissions = useMemo(
    () => grouped.flatMap(([, permissions]) => permissions),
    [grouped],
  );
  const visibleCodes = useMemo(
    () => visiblePermissions.map((permission) => permission.code),
    [visiblePermissions],
  );
  const allVisibleSelected =
    visibleCodes.length > 0 &&
    visibleCodes.every((code) => selected.has(code));
  const anyVisibleSelected = visibleCodes.some((code) => selected.has(code));
  const filterActive = search.trim().length > 0;

  const selectAllVisible = () => {
    const next = new Set(selected);
    for (const code of visibleCodes) next.add(code);
    onChange([...next].sort());
  };

  const clearAllVisible = () => {
    if (!filterActive) {
      onChange([]);
      return;
    }
    const visible = new Set(visibleCodes);
    onChange(value.filter((code) => !visible.has(code)).sort());
  };

  return (
    <Stack spacing={1.5} data-testid="permission-checklist">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <TextField
          size="small"
          label="Filter permissions"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          sx={{ flex: 1 }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {value.length} selected
          </Typography>
          <Button
            size="small"
            disabled={disabled || visibleCodes.length === 0 || allVisibleSelected}
            onClick={selectAllVisible}
          >
            {filterActive ? 'Select all matching' : 'Select all'}
          </Button>
          <Button
            size="small"
            disabled={
              disabled ||
              visibleCodes.length === 0 ||
              (!filterActive ? value.length === 0 : !anyVisibleSelected)
            }
            onClick={clearAllVisible}
          >
            {filterActive ? 'Clear matching' : 'Clear all'}
          </Button>
        </Stack>
      </Stack>
      {grouped.length === 0 ? (
        <Typography color="text.secondary">
          No permissions match this filter.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {grouped.map(([module, permissions]) => {
            const selectedCount = permissions.filter((permission) =>
              selected.has(permission.code),
            ).length;
            const allSelected =
              permissions.length > 0 &&
              selectedCount === permissions.length;
            return (
              <Paper key={module} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="subtitle2">
                      {moduleLabel(module)}
                    </Typography>
                    <Button
                      size="small"
                      disabled={disabled}
                      onClick={() =>
                        setModule(permissions, !allSelected)
                      }
                    >
                      {allSelected ? 'Clear module' : 'Select module'}
                    </Button>
                  </Stack>
                  <Stack>
                    {permissions.map((permission) => (
                      <FormControlLabel
                        key={permission.code}
                        control={
                          <Checkbox
                            size="small"
                            checked={selected.has(permission.code)}
                            onChange={() => toggle(permission.code)}
                            disabled={disabled}
                            slotProps={{
                              input: {
                                'aria-label': permission.code,
                              },
                            }}
                          />
                        }
                        label={
                          <Stack spacing={0}>
                            <Typography variant="body2">
                              {permission.action.replaceAll('_', ' ')}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: 'ui-monospace, monospace' }}
                            >
                              {permission.code}
                            </Typography>
                          </Stack>
                        }
                      />
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
