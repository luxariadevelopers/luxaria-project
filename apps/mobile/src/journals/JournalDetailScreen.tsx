import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatDate, formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { fetchJournal } from './api';
import { resolveJournalCapabilities } from './permissions';
import { JournalStatus, type PublicJournalEntry } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'JournalDetail'>;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function JournalDetailScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing journal.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open journal');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItem(await fetchJournal(journalId));
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load journal'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, isOnline, journalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const canReverse =
    caps.canReverse &&
    item?.status === JournalStatus.Posted &&
    !item.reversedBy;

  return (
    <Screen title="Journal" subtitle={item?.journalNumber ?? journalId}>
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !item}
          emptyLabel="Not found"
          onRetry={() => void load()}
        />
      ) : (
        <>
          <FormSection title="Entry">
            <Field label="Status" value={item.status} />
            <Field label="Date" value={formatDate(item.journalDate)} />
            <Field
              label="Totals"
              value={`Debit ${formatInr(item.totalDebit)} · Credit ${formatInr(item.totalCredit)}`}
            />
            <Field label="Narration" value={item.narration} />
            {item.sourceModule ? (
              <Field
                label="Source"
                value={`${item.sourceModule}${
                  item.sourceEntityType ? ` / ${item.sourceEntityType}` : ''
                }`}
              />
            ) : null}
          </FormSection>

          <FormSection title="Lines" framed={false}>
            {item.lines.map((line) => (
              <View key={line.id} style={styles.line}>
                <Text style={styles.meta}>
                  {line.accountId.slice(-6)} · Dr {formatInr(line.debit)} · Cr{' '}
                  {formatInr(line.credit)}
                </Text>
                {line.description ? (
                  <Text style={styles.meta}>{line.description}</Text>
                ) : null}
              </View>
            ))}
          </FormSection>

          {canReverse ? (
            <Button
              label="Reverse journal"
              onPress={() =>
                navigation.navigate('ReverseJournal', { journalId: item.id })
              }
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 2, marginBottom: spacing.sm },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  fieldValue: { ...typography.body, color: colors.text },
  line: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  meta: { ...typography.meta, fontSize: 13 },
});
