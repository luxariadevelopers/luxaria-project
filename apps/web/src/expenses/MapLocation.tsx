import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { EmptyState } from '@/components/errors';
import type { PublicSiteExpenseVoucher } from './types';

type Props = {
  voucher: PublicSiteExpenseVoucher;
};

function mapsUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

/**
 * Capture GPS coordinates from the voucher (read-only).
 */
export function MapLocation({ voucher }: Props) {
  const { latitude, longitude } = voucher;

  if (latitude == null || longitude == null) {
    return (
      <Box data-testid="expense-map-empty">
        <EmptyState
          title="No location captured"
          description="This voucher has no latitude / longitude from the capture device."
        />
      </Box>
    );
  }

  const href = mapsUrl(latitude, longitude);

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="expense-map-location">
      <Stack spacing={1}>
        <Typography variant="subtitle1">Capture location</Typography>
        <Typography variant="body2">
          Latitude: {latitude.toFixed(6)} · Longitude: {longitude.toFixed(6)}
        </Typography>
        <Link href={href} target="_blank" rel="noopener noreferrer">
          Open in OpenStreetMap
        </Link>
        <Box
          component="iframe"
          title="Expense capture map"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${
            longitude - 0.01
          }%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${
            latitude + 0.01
          }&layer=mapnik&marker=${latitude}%2C${longitude}`}
          sx={{
            width: '100%',
            height: 240,
            border: 0,
            borderRadius: 1,
          }}
        />
      </Stack>
    </Paper>
  );
}
