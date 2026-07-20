import {
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { PeriodChecklistItem } from './types';

type Props = {
  failedItems: PeriodChecklistItem[];
};

export function BlockingIssuesPanel({ failedItems }: Props) {
  if (failedItems.length === 0) {
    return (
      <Alert
        severity="success"
        variant="outlined"
        data-testid="blocking-issues-clear"
      >
        No blocking checklist failures. Period can be locked after a successful
        validation run.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="blocking-issues-panel">
      <Alert severity="error" variant="outlined">
        {failedItems.length} blocking check
        {failedItems.length === 1 ? '' : 's'} must be resolved before lock.
      </Alert>
      {failedItems.map((item) => (
        <Paper key={item.key} variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {item.label} ({item.issueCount})
          </Typography>
          {item.issues.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Failed with no detailed issue rows.
            </Typography>
          ) : (
            <List dense disablePadding>
              {item.issues.map((issue, index) => (
                <ListItem key={`${issue.entityId}-${index}`} disableGutters>
                  <ListItemText
                    primary={issue.detail}
                    secondary={[issue.entityType, issue.reference ?? issue.entityId]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
