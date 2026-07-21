import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  getEventTypeLabel,
} from '@/notifications/eventTypes';
import {
  formStateToPreferencesPatch,
  preferencesToFormState,
} from './preferenceUtils';
import type { NotificationPreferencesFormState } from './types';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './useNotificationPreferences';

export function NotificationPreferencesForm() {
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canManage = Boolean(access) && hasPermission('notification.view');
  const prefsQuery = useNotificationPreferences(canManage);
  const saveMutation = useUpdateNotificationPreferences();

  const [form, setForm] = useState<NotificationPreferencesFormState | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!prefsQuery.data) {
      return;
    }
    setForm(preferencesToFormState(prefsQuery.data.muted, prefsQuery.data.events));
    setDirty(false);
  }, [prefsQuery.data]);

  if (access && !canManage) {
    return (
      <PermissionDenied
        title="Notification preferences unavailable"
        message="You need the notification.view permission to manage notification delivery preferences."
        showHomeLink={false}
      />
    );
  }

  if (prefsQuery.isLoading || !form) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            Notification preferences
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        </Stack>
      </Paper>
    );
  }

  if (prefsQuery.error) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            Notification preferences
          </Typography>
          <RetryPanel
            error={prefsQuery.error}
            onRetry={() => void prefsQuery.refetch()}
            forceRetry
          />
        </Stack>
      </Paper>
    );
  }

  const updateForm = (next: NotificationPreferencesFormState) => {
    setForm(next);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form || !prefsQuery.data) {
      return;
    }
    try {
      await saveMutation.mutateAsync({
        muted: form.muted,
        events: formStateToPreferencesPatch(form, prefsQuery.data.events),
      });
      setDirty(false);
      notify.success('Notification preferences saved');
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Notification preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control mute settings and how alerts are delivered by email or
            WhatsApp. In-app inbox items may still appear when muted.
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={form.muted}
              onChange={(event) =>
                updateForm({ ...form, muted: event.target.checked })
              }
            />
          }
          label={
            <Box>
              <Typography variant="body1">Mute all notifications</Typography>
              <Typography variant="body2" color="text.secondary">
                Suppress outbound channels; critical in-app items may still
                appear in your inbox.
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', ml: 0, gap: 1.5 }}
        />

        <Divider />

        <TableContainer>
          <Table size="small" aria-label="Notification event preferences">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell align="center">Enabled</TableCell>
                <TableCell align="center">Email</TableCell>
                <TableCell align="center">WhatsApp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ALL_NOTIFICATION_EVENT_TYPES.map((eventType) => {
                const row = form.events[eventType];
                const rowDisabled = form.muted || !row.enabled;
                return (
                  <TableRow key={eventType} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {getEventTypeLabel(eventType)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" padding="checkbox">
                      <Switch
                        size="small"
                        checked={row.enabled}
                        disabled={form.muted}
                        slotProps={{
                          input: {
                            'aria-label': `${getEventTypeLabel(eventType)} enabled`,
                          },
                        }}
                        onChange={(event) =>
                          updateForm({
                            ...form,
                            events: {
                              ...form.events,
                              [eventType]: {
                                ...row,
                                enabled: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="center" padding="checkbox">
                      <Switch
                        size="small"
                        checked={row.email}
                        disabled={rowDisabled}
                        slotProps={{
                          input: {
                            'aria-label': `${getEventTypeLabel(eventType)} email`,
                          },
                        }}
                        onChange={(event) =>
                          updateForm({
                            ...form,
                            events: {
                              ...form.events,
                              [eventType]: {
                                ...row,
                                email: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="center" padding="checkbox">
                      <Switch
                        size="small"
                        checked={row.whatsapp}
                        disabled={rowDisabled}
                        slotProps={{
                          input: {
                            'aria-label': `${getEventTypeLabel(eventType)} WhatsApp`,
                          },
                        }}
                        onChange={(event) =>
                          updateForm({
                            ...form,
                            events: {
                              ...form.events,
                              [eventType]: {
                                ...row,
                                whatsapp: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {saveMutation.error ? (
          <Alert severity="error">{getErrorMessage(saveMutation.error)}</Alert>
        ) : null}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => void handleSave()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save preferences'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
