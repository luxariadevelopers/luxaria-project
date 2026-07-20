import { Alert, Chip, Stack, Typography } from '@mui/material';
import type { PublicLabourAttendance } from './types';

type Props = {
  sheet: PublicLabourAttendance;
};

/** GPS coordinates and group photo document IDs for review. */
export function EvidencePanel({ sheet }: Props) {
  const hasGps =
    sheet.latitude != null &&
    sheet.longitude != null &&
    Number.isFinite(sheet.latitude) &&
    Number.isFinite(sheet.longitude);
  const photoCount = sheet.groupPhotoDocumentIds.length;

  return (
    <Stack spacing={1.5} data-testid="attendance-evidence-panel">
      <Typography variant="subtitle2">Evidence</Typography>
      {hasGps ? (
        <Alert severity="success">
          GPS {sheet.latitude!.toFixed(5)}, {sheet.longitude!.toFixed(5)}
          {sheet.workLocation ? ` · ${sheet.workLocation}` : null}
        </Alert>
      ) : (
        <Alert severity="warning">No GPS coordinates on this sheet</Alert>
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={`${photoCount} group photo${photoCount === 1 ? '' : 's'}`}
          color={photoCount > 0 ? 'success' : 'warning'}
          variant="outlined"
        />
        {sheet.groupPhotoDocumentIds.map((id) => (
          <Chip
            key={id}
            size="small"
            label={`doc ${id.slice(-8)}`}
            variant="outlined"
          />
        ))}
      </Stack>
    </Stack>
  );
}
