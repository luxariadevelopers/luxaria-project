import { Alert, Button, Stack, Typography } from '@mui/material';
import { expiryAlertLabel } from './labels';
import type { PublicExpiryAlert } from './types';
import { useAcknowledgeExpiryAlert } from './useContractorAgreements';

type Props = {
  alerts: readonly PublicExpiryAlert[];
  canManage: boolean;
  onOpenAgreement?: (alert: PublicExpiryAlert) => void;
};

export function ExpiryAlertsBanner({
  alerts,
  canManage,
  onOpenAgreement,
}: Props) {
  const acknowledge = useAcknowledgeExpiryAlert();
  const unacked = alerts.filter((row) => !row.acknowledged);

  if (unacked.length === 0) return null;

  return (
    <Stack spacing={1} data-testid="agreement-expiry-alerts">
      {unacked.slice(0, 5).map((alert) => (
        <Alert
          key={alert.id}
          severity={
            alert.alertType === 'expired'
              ? 'error'
              : alert.alertType === 'expiring_critical'
                ? 'warning'
                : 'info'
          }
          action={
            <Stack direction="row" spacing={1}>
              {onOpenAgreement ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => onOpenAgreement(alert)}
                >
                  Open
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  color="inherit"
                  size="small"
                  disabled={acknowledge.isPending}
                  onClick={() => acknowledge.mutate(alert.id)}
                >
                  Acknowledge
                </Button>
              ) : null}
            </Stack>
          }
        >
          <Typography variant="body2">
            [{expiryAlertLabel(alert.alertType)}] {alert.message}
          </Typography>
        </Alert>
      ))}
    </Stack>
  );
}
