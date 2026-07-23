import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { formatDate } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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
        <>
          <FormSection title="Original">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={styles.fieldValue}>
                {formatDate(item.journalDate)}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Narration</Text>
              <Text style={styles.fieldValue}>{item.narration}</Text>
            </View>
          </FormSection>

          <FormSection title="Reversal">
            <TextField
              label="Reversal date (YYYY-MM-DD)"
              value={journalDate}
              onChangeText={setJournalDate}
              autoCapitalize="none"
              editable={!saving}
            />
            <TextField
              label="Reversal narration"
              value={narration}
              onChangeText={setNarration}
              multiline
              style={styles.multiline}
              editable={!saving}
            />
          </FormSection>

          <Button
            label="Confirm reverse"
            variant="danger"
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
  field: { gap: 2, marginBottom: spacing.sm },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  fieldValue: { ...typography.body, color: colors.text },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
