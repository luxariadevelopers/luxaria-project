import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import { PermissionDenied } from '@/components/errors';
import { formatDateTime } from '@/format';
import { KycStatusChip } from './KycStatusChip';
import { customerUiState, fundingTypeLabel, kycStatusLabel } from './kycState';
import { CustomerDocumentCategory, type PublicCustomer } from './types';
import { VerifyKycDialog } from './VerifyKycDialog';

type Props = {
  customer: PublicCustomer;
  canView: boolean;
  canVerifyKyc: boolean;
  documentCategories: readonly string[];
};

const KYC_CHECKS: Array<{
  id: string;
  label: string;
  done: (customer: PublicCustomer, cats: ReadonlySet<string>) => boolean;
}> = [
  {
    id: 'identity',
    label: 'Full name recorded',
    done: (c) => Boolean(c.fullName),
  },
  {
    id: 'pan',
    label: 'PAN on file',
    done: (c) => Boolean(c.pan),
  },
  {
    id: 'aadhaar',
    label: 'Aadhaar reference on file',
    done: (c) => Boolean(c.aadhaarReference),
  },
  {
    id: 'contact',
    label: 'Contact email or phone',
    done: (c) => Boolean(c.contact?.email || c.contact?.phone),
  },
  {
    id: 'funding',
    label: 'Funding type (and loan bank when required)',
    done: (c) =>
      Boolean(
        c.fundingType &&
          (c.fundingType === 'own_funds' || c.loanBank),
      ),
  },
  {
    id: 'kyc-doc',
    label: 'KYC / identity document uploaded',
    done: (_c, cats) =>
      cats.has(CustomerDocumentCategory.Kyc) ||
      cats.has(CustomerDocumentCategory.Pan) ||
      cats.has(CustomerDocumentCategory.Aadhaar),
  },
];

/**
 * KYC review checklist + verify/reject (`customer.manage`).
 * Audit fields: kycVerifiedBy / kycVerifiedAt / kycNotes from Nest.
 */
export function CustomerKycChecklist({
  customer,
  canView,
  canVerifyKyc,
  documentCategories,
}: Props) {
  const [kycTarget, setKycTarget] = useState<{
    verified: boolean;
  } | null>(null);

  const cats = useMemo(
    () => new Set(documentCategories),
    [documentCategories],
  );
  const ui = customerUiState(customer);
  const checks = KYC_CHECKS.map((c) => ({
    ...c,
    complete: c.done(customer, cats),
  }));
  const completeCount = checks.filter((c) => c.complete).length;

  if (!canView) {
    return (
      <PermissionDenied
        title="KYC unavailable"
        message="You need customer.view to open the KYC checklist."
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="customer-kyc-checklist">
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: 'center' }}
      >
        <KycStatusChip status={customer.kycStatus} />
        <Chip
          size="small"
          variant="outlined"
          label={fundingTypeLabel(customer.fundingType)}
        />
        <Typography variant="body2" color="text.secondary">
          {completeCount}/{checks.length} checks complete
        </Typography>
      </Stack>

      <List dense disablePadding>
        {checks.map((check) => (
          <ListItem key={check.id} disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              {check.complete ? (
                <CheckCircleOutlineOutlinedIcon color="success" fontSize="small" />
              ) : (
                <RadioButtonUncheckedOutlinedIcon
                  color="disabled"
                  fontSize="small"
                />
              )}
            </ListItemIcon>
            <ListItemText primary={check.label} />
          </ListItem>
        ))}
      </List>

      {(customer.kycVerifiedBy ||
        customer.kycVerifiedAt ||
        customer.kycNotes) && (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            Status: {kycStatusLabel(customer.kycStatus)}
          </Typography>
          {customer.kycVerifiedAt ? (
            <Typography variant="body2">
              Reviewed: {formatDateTime(customer.kycVerifiedAt)}
            </Typography>
          ) : null}
          {customer.kycVerifiedBy ? (
            <Typography variant="body2">
              By user: {customer.kycVerifiedBy}
            </Typography>
          ) : null}
          {customer.kycNotes ? (
            <Typography variant="body2">Notes: {customer.kycNotes}</Typography>
          ) : null}
        </Alert>
      )}

      {canVerifyKyc && ui.canReviewKyc ? (
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="success"
            onClick={() => setKycTarget({ verified: true })}
          >
            Verify KYC
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setKycTarget({ verified: false })}
          >
            Reject KYC
          </Button>
        </Stack>
      ) : null}

      {!canVerifyKyc ? (
        <Typography variant="caption" color="text.secondary">
          Verify/reject requires customer.manage (
          <code>POST /customers/:id/verify-kyc</code>).
        </Typography>
      ) : null}

      <VerifyKycDialog
        open={Boolean(kycTarget)}
        customer={{ id: customer.id, fullName: customer.fullName }}
        verified={kycTarget?.verified ?? true}
        onClose={() => setKycTarget(null)}
      />
    </Stack>
  );
}
