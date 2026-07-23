import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchActiveShareholding, fetchDirector } from './api';
import { resolveDirectorCapabilities } from './permissions';
import type { PublicDirector, PublicShareholding } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'DirectorDetail'>;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function DirectorDetailScreen({ navigation, route }: Props) {
  const { directorId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveDirectorCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicDirector | null>(null);
  const [holding, setHolding] = useState<PublicShareholding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing director.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to load director');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const director = await fetchDirector(directorId);
      setItem(director);
      setError(null);
      setForbidden(false);
      if (caps.canViewShareholding) {
        try {
          const summary = await fetchActiveShareholding(director.companyId);
          setHolding(
            summary.holdings.find((row) => row.directorId === director.id) ??
              null,
          );
        } catch {
          setHolding(null);
        }
      } else {
        setHolding(null);
      }
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load director'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, caps.canViewShareholding, directorId, isOnline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Director"
      subtitle={item?.directorCode ?? directorId}
      rightSlot={
        caps.canUpdate && item ? (
          <Pressable
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('DirectorForm', { directorId: item.id })
            }
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        ) : null
      }
    >
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !item}
          emptyLabel="Director not found"
          onRetry={() => void load()}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.status}>{item.status}</Text>
          <Field label="Director code" value={item.directorCode} />
          <Field label="Linked user" value={item.userCode ?? '—'} />
          {item.employeeId ? (
            <Field label="Employee ID" value={item.employeeId} />
          ) : null}
          <Field label="DIN" value={item.din ?? '—'} />
          <Field label="PAN" value={item.pan ?? '—'} />
          <Field label="Email" value={item.email ?? '—'} />
          <Field label="Phone" value={item.phone ?? '—'} />
          <Field label="Address" value={item.address ?? '—'} />
          <Field
            label="Appointment date"
            value={item.appointmentDate?.slice(0, 10) ?? '—'}
          />
          {holding ? (
            <Field
              label="Active shareholding"
              value={`${holding.percentage}% · ${holding.numberOfShares.toLocaleString('en-IN')} shares`}
            />
          ) : null}
          {item.isPlaceholder ? (
            <Text style={styles.note}>Seed placeholder director</Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: { color: '#F4F0E6', fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  status: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 4,
  },
  field: { gap: 2 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldValue: { color: colors.text, fontSize: 15 },
  note: { color: colors.textMuted, marginTop: 8, fontSize: 13 },
});
