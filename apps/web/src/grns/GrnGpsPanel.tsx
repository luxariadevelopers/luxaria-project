import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Button, Stack, Typography } from '@mui/material';

type Props = {
  latitude: number;
  longitude: number;
};

function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}

/**
 * Receipt GPS captured at site (required by Nest create/submit).
 */
export function GrnGpsPanel({ latitude, longitude }: Props) {
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!valid) {
    return (
      <Typography color="text.secondary" data-testid="grn-gps-missing">
        GPS coordinates unavailable.
      </Typography>
    );
  }

  return (
    <Stack spacing={1} data-testid="grn-gps-panel">
      <Typography variant="body2">
        Latitude <strong>{latitude.toFixed(6)}</strong>
        {' · '}
        Longitude <strong>{longitude.toFixed(6)}</strong>
      </Typography>
      <Button
        size="small"
        variant="outlined"
        startIcon={<OpenInNewOutlinedIcon />}
        href={mapsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ alignSelf: 'flex-start' }}
      >
        Open in maps
      </Button>
    </Stack>
  );
}
