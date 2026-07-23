import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatDate, formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchJournal } from './api';
import { resolveJournalCapabilities } from './permissions';
import { JournalStatus, type PublicJournalEntry } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'JournalDetail'>;

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
        <View style={styles.card}>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Date: {formatDate(item.journalDate)}</Text>
          <Text style={styles.row}>
            Debit: {formatInr(item.totalDebit)} · Credit:{' '}
            {formatInr(item.totalCredit)}
          </Text>
          <Text style={styles.row}>Narration: {item.narration}</Text>
          {item.sourceModule ? (
            <Text style={styles.row}>
              Source: {item.sourceModule}
              {item.sourceEntityType ? ` / ${item.sourceEntityType}` : ''}
            </Text>
          ) : null}
          <Text style={styles.section}>Lines</Text>
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
          {canReverse ? (
            <Pressable
              style={styles.btn}
              onPress={() =>
                navigation.navigate('ReverseJournal', { journalId: item.id })
              }
            >
              <Text style={styles.btnText}>Reverse journal</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  row: { color: colors.text, fontSize: 15 },
  section: {
    marginTop: 12,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  line: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  meta: { color: colors.textMuted, fontSize: 13 },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
});
