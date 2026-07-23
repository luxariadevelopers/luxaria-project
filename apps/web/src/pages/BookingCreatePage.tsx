import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { applyApiFieldErrors } from '@/components/forms';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { useCustomersList } from '@/customers/useCustomers';
import { UnitStatus } from '@/units/types';
import { useUnitsList } from '@/units/useUnits';
import { BookingForm } from '@/bookings/BookingForm';
import { BOOKING_ROUTES } from '@/bookings/routes';
import { resolveBookingCapabilities } from '@/bookings/roleAccess';
import {
  bookingFormSchema,
  defaultBookingFormValues,
  shapeCreatePayload,
  type BookingFormValues,
} from '@/bookings/validation';
import { useCreateBooking } from '@/bookings/useBookings';

/**
 * Create booking — `/sales/bookings/new`.
 * Nest: `POST /bookings` (`booking.create`).
 * Query: `?unitId=&customerId=` optional prefill.
 */
export function BookingCreatePage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBookingCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: notifyError } = useNotify();
  const create = useCreateBooking();

  const unitIdParam = searchParams.get('unitId')?.trim() || undefined;
  const customerIdParam = searchParams.get('customerId')?.trim() || undefined;

  const { control, handleSubmit, reset, setError } =
    useForm<BookingFormValues>({
      resolver: zodResolver(bookingFormSchema),
      defaultValues: defaultBookingFormValues({
        projectId: selectedProjectId ?? '',
        unitId: unitIdParam,
        customerId: customerIdParam,
      }),
      mode: 'onBlur',
    });

  useEffect(() => {
    if (!selectedProjectId) return;
    reset(
      defaultBookingFormValues({
        projectId: selectedProjectId,
        unitId: unitIdParam,
        customerId: customerIdParam,
      }),
    );
  }, [selectedProjectId, unitIdParam, customerIdParam, reset]);

  const customersQuery = useCustomersList(
    { page: 1, limit: 100 },
    Boolean(access) && caps.canCreate && Boolean(selectedProjectId),
  );

  const unitsQuery = useUnitsList(
    {
      page: 1,
      limit: 100,
      projectId: selectedProjectId ?? undefined,
      status: UnitStatus.Available,
    },
    Boolean(access) &&
      caps.canCreate &&
      Boolean(selectedProjectId) &&
      hasPermission('unit.view'),
  );

  const customerOptions = useMemo(
    () =>
      (customersQuery.data?.items ?? []).map((c) => ({
        value: c.id,
        label: c.customerCode
          ? `${c.fullName} (${c.customerCode})`
          : c.fullName,
      })),
    [customersQuery.data?.items],
  );

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.block}-${u.unitNumber}`,
      })),
    [unitsQuery.data?.items],
  );

  const onSubmit = async (values: BookingFormValues) => {
    try {
      const created = await create.mutateAsync(shapeCreatePayload(values));
      success(`Booking ${created.bookingNumber} created`);
      navigate(BOOKING_ROUTES.detail(created.id));
    } catch (err) {
      if (applyApiFieldErrors(setError, err)) return;
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canCreate) {
    return (
      <PermissionDenied
        title="Cannot create booking"
        message="You need booking.create to create or transition bookings."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header before creating a booking."
      />
    );
  }

  if (customersQuery.isError && isForbiddenError(customersQuery.error)) {
    return (
      <PermissionDenied
        title="Customers unavailable"
        message="customer.view is required to pick a customer for a new booking."
        showHomeLink={false}
      />
    );
  }

  if (customersQuery.isError) {
    return (
      <RetryPanel
        error={customersQuery.error}
        title="Could not load customers"
        onRetry={() => void customersQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
      <PageHeader
        title="New booking"
        subtitle="Creates a hold or pending-approval booking via Nest POST /bookings. Over-limit discounts require booking.approve before marking reserved."
        actions={
          <Button
            variant="text"
            onClick={() => navigate(BOOKING_ROUTES.list)}
            disabled={create.isPending}
          >
            Back to list
          </Button>
        }
      />

      <BookingForm
        control={control}
        customerOptions={customerOptions}
        unitOptions={unitOptions}
        customersLoading={customersQuery.isLoading}
        unitsLoading={unitsQuery.isLoading}
      />

      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => navigate(BOOKING_ROUTES.list)}
          disabled={create.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={
            create.isPending ||
            customerOptions.length === 0 ||
            unitOptions.length === 0
          }
        >
          {create.isPending ? 'Creating…' : 'Create booking'}
        </Button>
      </Stack>
    </Stack>
  );
}
