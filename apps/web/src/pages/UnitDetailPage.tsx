import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { LinkedBookingPanel } from '@/units/LinkedBookingPanel';
import { UnitDocumentsPanel } from '@/units/UnitDocumentsPanel';
import { UnitFormDrawer } from '@/units/UnitFormDrawer';
import { UnitPriceBreakup } from '@/units/UnitPriceBreakup';
import { UnitStatusChip } from '@/units/UnitStatusChip';
import { UnitStatusDialog } from '@/units/UnitStatusDialog';
import { UnitStatusHistory } from '@/units/UnitStatusHistory';
import { UnitSummary } from '@/units/UnitSummary';
import {
  canManuallyChangeUnitStatus,
} from '@/units/bookedRestrictions';
import { unitDisplayCode, unitSubtitle } from '@/units/labels';
import { UNITS_LIST_PATH } from '@/units/paths';
import { resolveUnitCapabilities } from '@/units/roleAccess';
import {
  useUnitBookings,
  useUnitDetail,
} from '@/units/useUnits';

/**
 * Unit detail — `/sales/units/:id` (Micro Phase 098).
 *
 * Nest: GET /units/:id, PATCH /units/:id, POST /units/:id/status,
 * GET /bookings?unitId=, documents by entityType=unit.
 * No dedicated status-history endpoint — client timeline from unit + bookings.
 */
export function UnitDetailPage() {
  const { id: unitId = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveUnitCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;

  const detailQuery = useUnitDetail(unitId || null, canView);
  const unit = detailQuery.data;

  const bookingsQuery = useUnitBookings(
    unitId || null,
    canView && caps.canViewBookings && Boolean(unit),
  );

  const bookings = bookingsQuery.data ?? [];
  const manualGate = useMemo(
    () =>
      unit
        ? canManuallyChangeUnitStatus(unit, bookings)
        : ({ ok: false as const, reason: 'Unit not loaded' }),
    [unit, bookings],
  );

  const actions: EntityDetailAction[] = unit
    ? [
        {
          id: 'edit',
          label: 'Edit',
          permission: 'unit.manage',
          allowedStatuses: [
            'available',
            'held',
            'reserved',
            'booked',
            'agreement_executed',
            'registered',
            'cancelled',
            'blocked',
          ],
          onClick: () => setEditOpen(true),
          disabled: !caps.canUpdate,
        },
        {
          id: 'status',
          label: 'Change status',
          permission: 'unit.manage',
          allowedStatuses: [
            'available',
            'held',
            'reserved',
            'booked',
            'agreement_executed',
            'cancelled',
            'blocked',
          ],
          onClick: () => setStatusOpen(true),
          disabled: !caps.canChangeStatus || !manualGate.ok,
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Unit unavailable"
        message="You need the unit.view permission to open unit detail."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Unit denied"
        message="The server denied access to this unit (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={Boolean(selectedProjectId)}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={!detailQuery.isLoading && !detailQuery.error && !unit}
        permissionTitle="Unit unavailable"
        permissionMessage="You need the unit.view permission to open unit detail."
        notFoundTitle="Unit not found"
        notFoundDescription="This unit id is invalid or the record was removed."
        header={
          unit ? (
            <DetailHeader
              title={unitDisplayCode(unit)}
              code={unit.unitNumber}
              subtitle={unitSubtitle(unit)}
              backTo={UNITS_LIST_PATH}
              backLabel="Units"
              meta={<UnitStatusChip status={unit.status} />}
            />
          ) : undefined
        }
        actionBar={
          unit ? (
            <EntityActionBar
              actions={actions}
              status={unit.status}
              hasPermission={hasPermission}
              emptyHint="Edit / status require unit.manage."
            />
          ) : undefined
        }
        tabs={
          unit ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <Stack spacing={2} data-testid="unit-detail-page">
                      {!manualGate.ok ? (
                        <Alert severity="warning">{manualGate.reason}</Alert>
                      ) : null}
                      <UnitSummary unit={unit} />
                      <UnitPriceBreakup unit={unit} />
                    </Stack>
                  ),
                },
                {
                  id: 'booking',
                  label: 'Booking',
                  content: (
                    <LinkedBookingPanel
                      bookings={bookings}
                      loading={bookingsQuery.isLoading}
                      error={bookingsQuery.error}
                      onRetry={() => void bookingsQuery.refetch()}
                      canView={caps.canViewBookings}
                      bookingRefId={unit.bookingRefId}
                    />
                  ),
                },
                {
                  id: 'history',
                  label: 'History',
                  content: (
                    <UnitStatusHistory unit={unit} bookings={bookings} />
                  ),
                },
                {
                  id: 'documents',
                  label: 'Documents',
                  content: (
                    <UnitDocumentsPanel
                      unitId={unit.id}
                      projectId={unit.projectId}
                      unitLabel={unitDisplayCode(unit)}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      {unit ? (
        <>
          <UnitFormDrawer
            open={editOpen}
            onClose={() => setEditOpen(false)}
            mode="edit"
            projectId={unit.projectId}
            unit={unit}
            existingUnits={[unit]}
          />
          <UnitStatusDialog
            open={statusOpen}
            onClose={() => setStatusOpen(false)}
            unit={unit}
            bookings={bookings}
          />
        </>
      ) : null}
    </>
  );
}
