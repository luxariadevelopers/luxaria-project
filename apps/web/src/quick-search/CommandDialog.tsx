import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/context/ProjectContext';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { QUICK_SEARCH_MIN_LENGTH } from './constants';
import type { QuickSearchHit } from './types';
import { useQuickSearch } from './useQuickSearch';

export type CommandDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Global command palette: grouped module search with keyboard navigation.
 */
export function CommandDialog({ open, onClose }: CommandDialogProps) {
  const navigate = useNavigate();
  const { setSelectedProjectId } = useProject();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const search = useQuickSearch({ query, enabled: open });

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search.debouncedQuery, search.hits.length]);

  const flatHits = search.hits;

  const hitIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    flatHits.forEach((hit, index) => {
      map.set(`${hit.sourceId}-${hit.id}`, index);
    });
    return map;
  }, [flatHits]);

  const activeHit =
    flatHits.length > 0 ? (flatHits[activeIndex] ?? null) : null;

  const selectHit = (hit: QuickSearchHit) => {
    if (hit.projectId) {
      setSelectedProjectId(hit.projectId);
    }
    onClose();
    navigate(hit.path, { state: { quickSearchHit: hit } });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatHits.length === 0) return;
      setActiveIndex((i) => (i + 1) % flatHits.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatHits.length === 0) return;
      setActiveIndex((i) => (i - 1 + flatHits.length) % flatHits.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeHit) {
        selectHit(activeHit);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const visibleGroups = search.groups.filter(
    (group) => group.hits.length > 0 || group.errors.length > 0,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label="Quick search"
      slotProps={{
        paper: {
          sx: { mt: { xs: 2, sm: 8 }, verticalAlign: 'top' },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }} onKeyDown={onKeyDown}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            autoComplete="off"
            placeholder="Search projects, vendors, contractors, customers, transactions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchIcon color="action" sx={{ mr: 1 }} fontSize="small" />
                ),
              },
              htmlInput: {
                'aria-controls': listId,
                'aria-autocomplete': 'list',
                'aria-activedescendant': activeHit
                  ? `quick-search-hit-${activeHit.sourceId}-${activeHit.id}`
                  : undefined,
                role: 'combobox',
                'aria-expanded': open,
              },
            }}
            helperText={
              search.belowMinLength
                ? `Type at least ${QUICK_SEARCH_MIN_LENGTH} characters`
                : '↑↓ to move · Enter to open · Esc to close'
            }
          />
        </Box>

        <Box
          id={listId}
          role="listbox"
          sx={{
            maxHeight: 420,
            overflow: 'auto',
            borderTop: 1,
            borderColor: 'divider',
            minHeight: 120,
          }}
        >
          {!search.hasAnySearchPermission ? (
            <Box sx={{ p: 2 }}>
              <PermissionDenied
                title="Search unavailable"
                message="You do not have permission to search any searchable modules."
                showHomeLink={false}
              />
            </Box>
          ) : query.trim().length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title="Quick search"
                description={`Search across modules you can access. Minimum ${QUICK_SEARCH_MIN_LENGTH} characters.`}
              />
            </Box>
          ) : search.belowMinLength ? (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Keep typing — need {QUICK_SEARCH_MIN_LENGTH} characters to
                search.
              </Typography>
            </Box>
          ) : search.isFetching || search.waitingForDebounce ? (
            <Stack
              spacing={1}
              sx={{ py: 4, alignItems: 'center' }}
              data-testid="quick-search-loading"
            >
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Searching…
              </Typography>
            </Stack>
          ) : search.isError ? (
            <Box sx={{ p: 2 }}>
              <RetryPanel
                error={search.error}
                onRetry={() => void search.refetch()}
                forceRetry
              />
            </Box>
          ) : flatHits.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title="No matches"
                description="No permitted records matched that query."
                actionLabel={
                  search.hasSourceErrors ? 'Retry failed sources' : undefined
                }
                onAction={
                  search.hasSourceErrors
                    ? () => void search.refetch()
                    : undefined
                }
              />
              {search.hasSourceErrors ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                >
                  Some modules returned an error (including possible 403).
                </Typography>
              ) : null}
            </Box>
          ) : (
            <List dense disablePadding>
              {visibleGroups.map((group) => (
                <li key={group.groupId}>
                  <ul style={{ padding: 0, margin: 0 }}>
                    <ListSubheader
                      sx={{
                        bgcolor: 'background.paper',
                        lineHeight: '36px',
                      }}
                    >
                      {group.label}
                      {group.errors.length > 0 ? ' (partial error)' : ''}
                    </ListSubheader>
                    {group.hits.map((hit) => {
                      const index =
                        hitIndexByKey.get(`${hit.sourceId}-${hit.id}`) ?? 0;
                      const selected = index === activeIndex;
                      return (
                        <ListItemButton
                          key={`${hit.sourceId}-${hit.id}`}
                          id={`quick-search-hit-${hit.sourceId}-${hit.id}`}
                          role="option"
                          aria-selected={selected}
                          selected={selected}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectHit(hit)}
                        >
                          <ListItemText
                            primary={hit.title}
                            secondary={`${hit.subtitle}${
                              hit.status ? ` · ${hit.status}` : ''
                            }`}
                          />
                        </ListItemButton>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
