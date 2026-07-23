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
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatDate } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchJournal, reverseJournal } from './api';
import { resolveJournalCapabilities } from './permissions';
import type { PublicJournalEntry } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'ReverseJournal'>;

export function ReverseJournalScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [journalDate, setJournalDate] = useState('');
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canReverse) {
      setForbidden(true);
      setError('Missing journal.reverse');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to reverse a journal');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const journal = await fetchJournal(journalId);
      setItem(journal);
      setJournalDate(String(journal.journalDate).slice(0, 10));
      setNarration(
        `Reversal of ${journal.journalNumber}: ${journal.narration}`,
      );
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load journal'));
    } finally {
      setLoading(false);
    }
  }, [caps.canReverse, isOnline, journalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!item) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(journalDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD');
      return;
    }
    if (!narration.trim()) {
      Alert.alert('Narration required');
      return;
    }
    setSaving(true);
    try {
      const result = await reverseJournal(item.id, {
        journalDate,
        narration: narration.trim(),
      });
      Alert.alert(
        'Reversed',
        `${result.original.journalNumber} → ${result.reversal.journalNumber}`,
      );
      navigation.replace('JournalDetail', {
        journalId: result.reversal.id,
      });
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Reverse failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Reverse journal"
      subtitle={item?.journalNumber ?? journalId}
    >
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
          <Text style={styles.row}>
            Original date: {formatDate(item.journalDate)}
          </Text>
          <Text style={styles.row}>Narration: {item.narration}</Text>
          <Text style={styles.label}>Reversal date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={journalDate}
            onChangeText={setJournalDate}
            autoCapitalize="none"
            editable={!saving}
          />
          <Text style={styles.label}>Reversal narration</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={narration}
            onChangeText={setNarration}
            multiline
            editable={!saving}
          />
          <Pressable
            style={[styles.btn, saving && styles.disabled]}
            disabled={saving}
            onPress={() => void submit()}
          >
            <Text style={styles.btnText}>
              {saving ? 'Reversing…' : 'Confirm reverse'}
            </Text>
          </Pressable>
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
  label: { color: colors.textMuted, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: {
    marginTop: 16,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
