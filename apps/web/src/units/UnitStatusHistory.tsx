import { Alert, Stack, Typography } from '@mui/material';
import { WorkflowTimeline } from '@/workflow-timeline';
import { buildUnitStatusHistory } from './buildUnitStatusHistory';
import type { LinkedBooking, PublicUnit } from './types';

type Props = {
  unit: PublicUnit;
  bookings: readonly LinkedBooking[];
};

/**
 * Status history — Nest has no dedicated timeline endpoint.
 * Built client-side from unit timestamps + linked booking markers.
 */
export function UnitStatusHistory({ unit, bookings }: Props) {
  const events = buildUnitStatusHistory(unit, bookings);

  return (
    <Stack spacing={1.5} data-testid="unit-status-history">
      <Typography variant="subtitle1">Status history</Typography>
      <Alert severity="info">
        Nest has no unit status-history API. This timeline is derived from the
        unit record and linked bookings.
      </Alert>
      <WorkflowTimeline
        events={events}
        canView
        emptyTitle="No status history yet"
        emptyDescription="Unit and booking markers will appear here as inventory status changes."
        title="Inventory timeline"
      />
    </Stack>
  );
}
