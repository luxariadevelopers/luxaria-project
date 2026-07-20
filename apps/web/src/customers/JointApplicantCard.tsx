import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { PermissionDenied } from '@/components/errors';
import { resolveAadhaarDisplay } from './aadhaarMasking';
import type { PublicCustomer } from './types';

type Props = {
  customer: PublicCustomer;
  canView: boolean;
  canViewSensitive: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function JointApplicantCard({
  customer,
  canView,
  canViewSensitive,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const joint = customer.jointApplicant;
  const hasJoint = Boolean(
    joint?.fullName ||
      joint?.pan ||
      joint?.aadhaarReference ||
      joint?.phone ||
      joint?.email,
  );

  if (!canView) {
    return (
      <PermissionDenied
        title="Joint applicant unavailable"
        message="You need customer.view to see joint applicant details."
        showHomeLink={false}
      />
    );
  }

  if (!hasJoint) {
    return (
      <Typography variant="body2" color="text.secondary">
        No joint applicant recorded for this customer.
      </Typography>
    );
  }

  const aadhaar = resolveAadhaarDisplay({
    aadhaar: joint.aadhaar,
    aadhaarReference: joint.aadhaarReference,
    canViewSensitive,
    revealed,
  });

  return (
    <Stack spacing={2} data-testid="customer-joint-applicant">
      <Typography variant="body2" color="text.secondary">
        Joint applicant identity. Aadhaar stays masked unless you have
        customer.manage and choose to reveal.
      </Typography>
      <Field label="Name" value={joint.fullName ?? '—'} />
      <Field label="Relationship" value={joint.relationship ?? '—'} />
      <Field label="PAN" value={joint.pan ?? '—'} />
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Field label="Aadhaar" value={aadhaar.display} />
        {aadhaar.canReveal ? (
          <Button
            size="small"
            onClick={() => setRevealed((v) => !v)}
            sx={{ alignSelf: 'flex-end' }}
          >
            {aadhaar.isRevealed ? 'Hide' : 'Reveal'}
          </Button>
        ) : null}
      </Stack>
      <Field label="Phone" value={joint.phone ?? '—'} />
      <Field label="Email" value={joint.email ?? '—'} />
    </Stack>
  );
}
