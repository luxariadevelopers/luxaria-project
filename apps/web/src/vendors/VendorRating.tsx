import { Typography } from '@mui/material';
import { formatVendorRating } from './labels';

type Props = {
  rating: number | null | undefined;
};

/** Compact rating display (0–5). No star widgets — keep DataGrid cells light. */
export function VendorRating({ rating }: Props) {
  return (
    <Typography
      variant="body2"
      component="span"
      data-testid="vendor-rating"
      data-rating={rating == null ? '' : String(rating)}
    >
      {formatVendorRating(rating)}
    </Typography>
  );
}
