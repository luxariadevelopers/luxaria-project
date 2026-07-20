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
import { investorUiState, kycStatusLabel } from './kycState';
import { InvestorDocumentCategory, type PublicInvestor } from './types';
import { VerifyKycDialog } from './VerifyKycDialog';

type Props = {
  investor: PublicInvestor;
  canView: boolean;
  canVerifyKyc: boolean;
  /** Document categories present on the investor. */
  documentCategories: readonly string[];
};

const KYC_CHECKS: Array<{
  id: string;
  label: string;
  done: (investor: PublicInvestor, cats: ReadonlySet<string>) => boolean;
}> = [
  {
    id: 'identity',
    label: 'Legal name & investor type recorded',
    done: (inv) => Boolean(inv.legalName && inv.investorType),
  },
  {
    id: 'pan',
    label: 'PAN on file (or company CIN/GSTIN as applicable)',
    done: (inv) => Boolean(inv.pan || inv.cin || inv.gstin),
  },
  {
    id: 'contact',
    label: 'Contact email or phone',
    done: (inv) => Boolean(inv.contact?.email || inv.contact?.phone),
  },
  {
    id: 'bank',
    label: 'Bank details (IFSC / last4)',
    done: (inv) =>
      Boolean(
        inv.bankDetails?.ifsc || inv.bankDetails?.accountNumberLast4,
      ),
  },
  {
    id: 'kyc-doc',
    label: 'KYC / identity document uploaded',
    done: (_inv, cats) =>
      cats.has(InvestorDocumentCategory.Kyc) ||
      cats.has(InvestorDocumentCategory.Pan) ||
      cats.has(InvestorDocumentCategory.Aadhaar),
  },
  {
    id: 'bank-proof',
    label: 'Bank proof document (recommended)',
    done: (_inv, cats) => cats.has(InvestorDocumentCategory.BankProof),
  },
];

/**
 * KYC review checklist + verify/reject actions (`investor.verify_kyc`).
 * Audit fields: kycVerifiedBy / kycVerifiedAt / kycNotes from Nest.
 */
export function InvestorKycChecklist({
  investor,
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
  const ui = investorUiState(investor);
  const checks = KYC_CHECKS.map((c) => ({
    ...c,
    complete: c.done(investor, cats),
  }));
  const completeCount = checks.filter((c) => c.complete).length;

  if (!canView) {
    return (
      <PermissionDenied
        title="KYC unavailable"
        message="You need investor.view to review investor KYC."
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="investor-kyc-checklist">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <KycStatusChip status={investor.kycStatus} />
        <Chip
          size="small"
          variant="outlined"
          label={`${completeCount}/${checks.length} checks`}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Review checklist before verify/reject. Actions call{' '}
        <code>POST /investors/:id/verify-kyc</code> (
        <code>investor.verify_kyc</code>) — Nest records verifier, timestamp and
        notes for auditability.
      </Typography>

      <List dense disablePadding>
        {checks.map((check) => (
          <ListItem key={check.id} disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              {check.complete ? (
                <CheckCircleOutlineOutlinedIcon
                  color="success"
                  fontSize="small"
                />
              ) : (
                <RadioButtonUncheckedOutlinedIcon
                  color="disabled"
                  fontSize="small"
                />
              )}
            </ListItemIcon>
            <ListItemText
              primary={check.label}
              slotProps={{ primary: { variant: 'body2' } }}
            />
          </ListItem>
        ))}
      </List>

      <Alert severity="info" variant="outlined">
        <Typography variant="body2">
          Status: {kycStatusLabel(investor.kycStatus)}
        </Typography>
        {investor.kycVerifiedAt ? (
          <Typography variant="body2">
            Last decision:{' '}
            {formatDateTime(investor.kycVerifiedAt)}
            {investor.kycVerifiedBy
              ? ` · by …${investor.kycVerifiedBy.slice(-8)}`
              : ''}
          </Typography>
        ) : (
          <Typography variant="body2">No KYC decision recorded yet.</Typography>
        )}
        {investor.kycNotes ? (
          <Typography variant="body2">Notes: {investor.kycNotes}</Typography>
        ) : null}
      </Alert>

      {canVerifyKyc ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            disabled={!ui.canReviewKyc}
            onClick={() => setKycTarget({ verified: true })}
            data-testid="investor-kyc-verify"
          >
            Verify KYC
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!ui.canReviewKyc}
            onClick={() => setKycTarget({ verified: false })}
            data-testid="investor-kyc-reject"
          >
            Reject KYC
          </Button>
        </Stack>
      ) : (
        <Alert
          severity="warning"
          variant="outlined"
          data-testid="investor-kyc-permission-denied"
        >
          KYC approve/reject requires investor.verify_kyc. Nest also enforces
          this on POST /investors/:id/verify-kyc (hiding the button is not
          enough).
        </Alert>
      )}

      <VerifyKycDialog
        open={Boolean(kycTarget)}
        investor={investor}
        verified={kycTarget?.verified ?? true}
        onClose={() => setKycTarget(null)}
      />
    </Stack>
  );
}
