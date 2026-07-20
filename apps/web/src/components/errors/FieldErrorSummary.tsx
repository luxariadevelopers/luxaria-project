import { List, ListItem, ListItemText, Typography } from '@mui/material';
import type { ApiErrorDetail, NormalizedAppError } from '@luxaria/shared-types';

type Props = {
  details?: ApiErrorDetail[];
  fieldErrors?: Record<string, string>;
  /** When provided, details/fieldErrors are taken from the normalised error. */
  error?: NormalizedAppError;
  title?: string;
};

function resolveRows(
  details: ApiErrorDetail[] | undefined,
  fieldErrors: Record<string, string> | undefined,
): { key: string; text: string }[] {
  if (details && details.length > 0) {
    return details.map((d, i) => ({
      key: d.field ? `${d.field}-${i}` : `detail-${i}`,
      text: d.field ? `${d.field}: ${d.message}` : d.message,
    }));
  }
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    return Object.entries(fieldErrors).map(([field, message]) => ({
      key: field,
      text: `${field}: ${message}`,
    }));
  }
  return [];
}

/** Lists API validation / field-level detail rows for forms and alerts. */
export function FieldErrorSummary({
  details,
  fieldErrors,
  error,
  title = 'Please fix the following:',
}: Props) {
  const rows = resolveRows(
    details ?? error?.details,
    fieldErrors ?? error?.fieldErrors,
  );
  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        {title}
      </Typography>
      <List dense disablePadding>
        {rows.map((row) => (
          <ListItem key={row.key} disableGutters sx={{ py: 0.25 }}>
            <ListItemText
              primary={row.text}
              slotProps={{
                primary: { variant: 'body2', color: 'error' },
              }}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
