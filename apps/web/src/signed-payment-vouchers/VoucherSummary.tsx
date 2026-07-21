import { Stack, Typography } from '@mui/material';
import {
  SummaryCards,
  type EntitySummaryField,
} from '@/components/entity-detail';
import { formatDate, formatInr } from '@/format';
import type { PublicSignedPaymentVoucher } from './types';

type Props = {
  voucher: PublicSignedPaymentVoucher;
  projectLabel: string;
};

export function VoucherSummary({ voucher, projectLabel }: Props) {
  const fields: EntitySummaryField[] = [
    {
      id: 'captured',
      label: 'Captured',
      value: formatDate(voucher.capturedAt),
    },
    {
      id: 'gross',
      label: 'Gross',
      value: formatInr(voucher.grossAmount),
    },
    {
      id: 'deductions',
      label: 'Deductions',
      value: formatInr(voucher.deductions),
    },
    {
      id: 'net',
      label: 'Net payable',
      value: formatInr(voucher.netAmount),
    },
    {
      id: 'recipient',
      label: 'Recipient',
      value: voucher.recipientName,
    },
    {
      id: 'project',
      label: 'Project',
      value: projectLabel,
    },
  ];

  return (
    <Stack spacing={2} data-testid="signed-voucher-summary">
      <SummaryCards fields={fields} />
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Work description</Typography>
        <Typography variant="body2">{voucher.workDescription}</Typography>
        {voucher.recipientMobile ? (
          <Typography variant="body2" color="text.secondary">
            Mobile: {voucher.recipientMobile}
          </Typography>
        ) : null}
        {voucher.deviceId ? (
          <Typography variant="body2" color="text.secondary">
            Device: {voucher.deviceId}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
