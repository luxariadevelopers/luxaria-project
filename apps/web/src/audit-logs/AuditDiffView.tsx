import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { buildAuditDiff, formatAuditJson } from './buildAuditDiff';

type Props = {
  beforeData: Record<string, unknown> | null | undefined;
  afterData: Record<string, unknown> | null | undefined;
  /** When true, use a lower row cap (stress / large JSON). */
  compact?: boolean;
};

const CHANGE_COLOR: Record<
  'added' | 'removed' | 'changed' | 'unchanged',
  'success' | 'error' | 'warning' | 'default'
> = {
  added: 'success',
  removed: 'error',
  changed: 'warning',
  unchanged: 'default',
};

/**
 * Read-only before/after diff. Never provides edit controls.
 */
export function AuditDiffView({
  beforeData,
  afterData,
  compact = false,
}: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const diff = useMemo(
    () =>
      buildAuditDiff(beforeData, afterData, {
        maxDepth: compact ? 4 : 6,
        maxEntries: expanded ? 500 : compact ? 80 : 200,
      }),
    [beforeData, afterData, compact, expanded],
  );

  const rawBefore = formatAuditJson(beforeData, expanded ? 20_000 : 4_000);
  const rawAfter = formatAuditJson(afterData, expanded ? 20_000 : 4_000);

  if (beforeData == null && afterData == null) {
    return (
      <Typography variant="body2" color="text.secondary">
        No before/after snapshot for this event.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="audit-diff-view">
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Typography variant="subtitle2">Before / after</Typography>
        <Chip size="small" label={`${diff.rows.length} field changes`} />
        {diff.truncated ? (
          <Chip size="small" color="warning" label="Diff truncated" />
        ) : null}
        <Button size="small" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
        </Button>
        <Button size="small" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Compact view' : 'Expand large payloads'}
        </Button>
      </Stack>

      {showRaw ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Before{rawBefore.truncated ? ' (truncated)' : ''}
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                maxHeight: 360,
                overflow: 'auto',
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {rawBefore.text}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              After{rawAfter.truncated ? ' (truncated)' : ''}
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                maxHeight: 360,
                overflow: 'auto',
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {rawAfter.text}
            </Box>
          </Box>
        </Stack>
      ) : (
        <Box sx={{ maxHeight: 420, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Path</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Before</TableCell>
                <TableCell>After</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diff.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No field-level differences.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                diff.rows.map((row) => {
                  const beforeFmt = formatAuditJson(row.before, 500);
                  const afterFmt = formatAuditJson(row.after, 500);
                  return (
                    <TableRow key={row.path}>
                      <TableCell
                        sx={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: 12,
                          verticalAlign: 'top',
                        }}
                      >
                        {row.path}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Chip
                          size="small"
                          color={CHANGE_COLOR[row.change]}
                          label={row.change}
                          variant={
                            row.change === 'unchanged' ? 'outlined' : 'filled'
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          verticalAlign: 'top',
                          maxWidth: 280,
                        }}
                      >
                        {beforeFmt.text}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          verticalAlign: 'top',
                          maxWidth: 280,
                        }}
                      >
                        {afterFmt.text}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
