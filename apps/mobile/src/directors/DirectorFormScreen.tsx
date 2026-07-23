import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import {
  createDirector,
  fetchDirector,
  listUsersForDirectorLink,
  updateDirector,
} from './api';
import { resolveDirectorCapabilities } from './permissions';
import {
  DirectorStatus,
  type DirectorUserOption,
  type PublicDirector,
} from './types';
import {
  emptyDirectorFormValues,
  toCreateDirectorInput,
  validateDirectorForm,
  type DirectorFormValues,
} from './validation';

type Props = NativeStackScreenProps<AppStackParamList, 'DirectorForm'>;

const STATUS_OPTIONS = [
  DirectorStatus.Active,
  DirectorStatus.Inactive,
  DirectorStatus.Resigned,
] as const;

export function DirectorFormScreen({ navigation, route }: Props) {
  const directorId = route.params?.directorId;
  const isEdit = Boolean(directorId);
  const { hasPermission } = useAuth();
  const caps = resolveDirectorCapabilities(hasPermission);
  const canListUsers = hasPermission('user.view');
  const { isOnline } = useNetwork();

  const [values, setValues] = useState<DirectorFormValues>(
    emptyDirectorFormValues(),
  );
  const [linkedEmployeeId, setLinkedEmployeeId] = useState<string | null>(null);
  const [users, setUsers] = useState<DirectorUserOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const canSubmit = isEdit ? caps.canUpdate : caps.canCreate;

  const applyDirector = useCallback((director: PublicDirector) => {
    setValues({
      fullName: director.fullName ?? '',
      userId: director.userId ?? '',
      din: director.din ?? '',
      pan: director.pan ?? '',
      email: director.email ?? '',
      phone: director.phone ?? '',
      address: director.address ?? '',
      appointmentDate: director.appointmentDate?.slice(0, 10) ?? '',
      status: director.status ?? DirectorStatus.Active,
    });
    setLinkedEmployeeId(director.employeeId ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!canSubmit) {
      setForbidden(true);
      setError(
        isEdit ? 'Missing director.update' : 'Missing director.create',
      );
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to manage directors');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      if (canListUsers) {
        const rows = await listUsersForDirectorLink();
        setUsers(rows);
      }
      if (isEdit && directorId) {
        const director = await fetchDirector(directorId);
        applyDirector(director);
      }
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load form'));
    } finally {
      setLoading(false);
    }
  }, [
    applyDirector,
    canListUsers,
    canSubmit,
    directorId,
    isEdit,
    isOnline,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!values.userId) {
      if (!isEdit) setLinkedEmployeeId(null);
      return;
    }
    const selected = users.find((u) => u.id === values.userId);
    if (selected?.employeeId) {
      setLinkedEmployeeId(selected.employeeId);
    }
  }, [isEdit, users, values.userId]);

  const setField = <K extends keyof DirectorFormValues>(
    key: K,
    value: DirectorFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!isOnline) {
      setError('Requires network');
      return;
    }
    const validationError = validateDirectorForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = toCreateDirectorInput(values);
      if (isEdit && directorId) {
        const updated = await updateDirector(directorId, payload);
        Alert.alert('Saved', updated.directorCode);
        navigation.replace('DirectorDetail', { directorId: updated.id });
      } else {
        const created = await createDirector(payload);
        Alert.alert('Created', created.directorCode);
        navigation.replace('DirectorDetail', { directorId: created.id });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save director'));
    } finally {
      setSaving(false);
    }
  };

  if (!canSubmit) {
    return (
      <Screen
        title={isEdit ? 'Edit director' : 'New director'}
        subtitle="Permission required"
      >
        <Text style={styles.error}>
          {isEdit
            ? 'You need director.update.'
            : 'You need director.create.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      title={isEdit ? 'Edit director' : 'New director'}
      subtitle="Company capital"
    >
      {loading ? (
        <AsyncStatePanel
          loading
          error={error}
          forbidden={forbidden}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FormSection title="Identity">
            <TextField
              label="Full name *"
              value={values.fullName}
              onChangeText={(v) => setField('fullName', v)}
            />

            <Text style={styles.label}>Linked user *</Text>
            {canListUsers ? (
              <View style={styles.chips}>
                {users.map((user) => (
                  <Chip
                    key={user.id}
                    label={[
                      user.userCode,
                      user.fullName,
                      user.employeeId ? `[${user.employeeId}]` : null,
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                    selected={values.userId === user.id}
                    onPress={() => setField('userId', user.id)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>
                You need user.view to choose a linked user.
              </Text>
            )}
            <TextField
              label="User id"
              value={values.userId}
              onChangeText={(v) => setField('userId', v)}
              autoCapitalize="none"
              placeholder="User id"
            />

            {linkedEmployeeId ? (
              <View style={styles.readonly}>
                <Text style={styles.fieldLabel}>Employee ID (read-only)</Text>
                <Text style={styles.readonlyText}>{linkedEmployeeId}</Text>
              </View>
            ) : null}
          </FormSection>

          <FormSection title="Contact & compliance">
            <TextField
              label="DIN"
              value={values.din}
              onChangeText={(v) => setField('din', v)}
              keyboardType="number-pad"
              maxLength={8}
            />
            <TextField
              label="PAN"
              value={values.pan}
              onChangeText={(v) => setField('pan', v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TextField
              label="Email"
              value={values.email}
              onChangeText={(v) => setField('email', v)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Phone"
              value={values.phone}
              onChangeText={(v) => setField('phone', v)}
              keyboardType="phone-pad"
            />
            <TextField
              label="Address"
              value={values.address}
              onChangeText={(v) => setField('address', v)}
              multiline
              style={styles.multiline}
            />
            <TextField
              label="Appointment date (YYYY-MM-DD)"
              value={values.appointmentDate}
              onChangeText={(v) => setField('appointmentDate', v)}
              autoCapitalize="none"
              placeholder="2024-01-15"
            />
          </FormSection>

          <FormSection title="Status">
            <View style={styles.chips}>
              {STATUS_OPTIONS.map((status) => (
                <Chip
                  key={status}
                  label={status}
                  selected={values.status === status}
                  onPress={() => setField('status', status)}
                />
              ))}
            </View>
          </FormSection>

          <Button
            label={isEdit ? 'Save changes' : 'Create director'}
            loading={saving}
            disabled={saving}
            onPress={() => void submit()}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: { ...typography.meta, fontSize: 13, marginBottom: spacing.sm },
  readonly: { marginBottom: spacing.md, gap: 2 },
  fieldLabel: { ...typography.label, fontSize: 12 },
  readonlyText: { ...typography.bodyStrong },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
