import {
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { resolveCustomerPortalCapabilities } from '@/customer-portal/roleAccess';
import {
  useCustomerPortalDocuments,
  useCustomerPortalMe,
} from '@/customer-portal/useCustomerPortal';

export function CustomerPortalPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerPortalCapabilities(hasPermission);
  const profileQuery = useCustomerPortalMe(caps.canView);
  const docsQuery = useCustomerPortalDocuments(caps.canView);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Customer portal unavailable"
        message="You need the customer_portal.view permission."
      />
    );
  }

  if (profileQuery.isError) {
    return <RetryPanel onRetry={() => void profileQuery.refetch()} />;
  }

  const profile = profileQuery.data;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Customer Portal</Typography>
      <Typography variant="body2" color="text.secondary">
        Buyer self-service view — profile, bookings, dues, and documents.
      </Typography>
      {profileQuery.isLoading ? (
        <Alert severity="info">Loading portal profile…</Alert>
      ) : null}
      {profile ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6">{profile.fullName}</Typography>
          <Typography color="text.secondary">
            {profile.email ?? profile.phone ?? 'No contact on file'}
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Outstanding dues: {profile.outstandingDues.toLocaleString()}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Bookings ({profile.bookings.length})
          </Typography>
          <List dense>
            {profile.bookings.map((b) => (
              <ListItem key={b.id} disablePadding>
                <ListItemText
                  primary={b.bookingNumber}
                  secondary={`${b.status} · unit ${b.unitId}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1">Documents</Typography>
        {docsQuery.isError ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Documents endpoint unavailable yet.
          </Alert>
        ) : (
          <List dense>
            {(docsQuery.data ?? []).map((doc) => (
              <ListItem key={doc.id} disablePadding>
                <ListItemText primary={doc.title} secondary={doc.category} />
              </ListItem>
            ))}
            {(docsQuery.data ?? []).length === 0 && !docsQuery.isLoading ? (
              <ListItem disablePadding>
                <ListItemText primary="No documents" />
              </ListItem>
            ) : null}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
