import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
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

          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            value={values.fullName}
            onChangeText={(v) => setField('fullName', v)}
          />

          <Text style={styles.label}>Linked user *</Text>
          {canListUsers ? (
            <View style={styles.chips}>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  style={[
                    styles.chip,
                    values.userId === user.id && styles.chipActive,
                  ]}
                  onPress={() => setField('userId', user.id)}
                >
                  <Text style={styles.chipText}>
                    {[
                      user.userCode,
                      user.fullName,
                      user.employeeId ? `[${user.employeeId}]` : null,
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              You need user.view to choose a linked user.
            </Text>
          )}
          <TextInput
            style={styles.input}
            value={values.userId}
            onChangeText={(v) => setField('userId', v)}
            autoCapitalize="none"
            placeholder="User id"
            placeholderTextColor={colors.textMuted}
          />

          {linkedEmployeeId ? (
            <>
              <Text style={styles.label}>Employee ID (read-only)</Text>
              <View style={styles.readonly}>
                <Text style={styles.readonlyText}>{linkedEmployeeId}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.label}>DIN</Text>
          <TextInput
            style={styles.input}
            value={values.din}
            onChangeText={(v) => setField('din', v)}
            keyboardType="number-pad"
            maxLength={8}
          />

          <Text style={styles.label}>PAN</Text>
          <TextInput
            style={styles.input}
            value={values.pan}
            onChangeText={(v) => setField('pan', v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={values.email}
            onChangeText={(v) => setField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={values.phone}
            onChangeText={(v) => setField('phone', v)}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={values.address}
            onChangeText={(v) => setField('address', v)}
            multiline
          />

          <Text style={styles.label}>Appointment date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={values.appointmentDate}
            onChangeText={(v) => setField('appointmentDate', v)}
            autoCapitalize="none"
            placeholder="2024-01-15"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chips}>
            {STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.chip,
                  values.status === status && styles.chipActive,
                ]}
                onPress={() => setField('status', status)}
              >
                <Text style={styles.chipText}>{status}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.submit, saving && styles.disabled]}
            disabled={saving}
            onPress={() => void submit()}
          >
            <Text style={styles.submitText}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create director'}
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  readonly: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { color: colors.text, fontWeight: '600' },
  submit: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
