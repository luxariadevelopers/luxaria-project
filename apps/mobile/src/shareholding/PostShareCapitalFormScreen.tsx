import { useCallback, useMemo, useState } from 'react';
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
import { formatInr } from '@/format';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import {
  fetchActiveCompanyBankAccounts,
  fetchActiveShareholding,
  fetchDirectors,
  postShareCapitalReceipt,
} from '@/directors/api';
import type {
  CompanyBankAccountOption,
  PublicDirector,
  PublicShareholding,
} from '@/directors/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { resolveShareholdingCapabilities } from './permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'PostShareCapital'>;

export function PostShareCapitalFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveShareholdingCapabilities(hasPermission);
  const { isOnline } = useNetwork();

  const [holdings, setHoldings] = useState<PublicShareholding[]>([]);
  const [directors, setDirectors] = useState<PublicDirector[]>([]);
  const [banks, setBanks] = useState<CompanyBankAccountOption[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [receivedDate, setReceivedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const directorNameById = useMemo(
    () =>
      new Map(
        directors.map((row) => [
          row.id,
          `${row.directorCode} — ${row.fullName}`,
        ]),
      ),
    [directors],
  );

  const lines = useMemo(
    () =>
      holdings.map((row) => ({
        directorId: row.directorId,
        label:
          directorNameById.get(row.directorId) ??
          `Director …${row.directorId.slice(-6)}`,
        numberOfShares: row.numberOfShares,
        faceValue: row.faceValue,
        amount: row.numberOfShares * row.faceValue,
      })),
    [directorNameById, holdings],
  );

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount, 0),
    [lines],
  );

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing shareholding.view');
      setLoading(false);
      return;
    }
    if (!caps.canPostCapital) {
      setForbidden(true);
      setError('Missing company.update');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to post share capital');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [active, directorPage, bankRows] = await Promise.all([
        fetchActiveShareholding(),
        fetchDirectors({ page: 1, limit: 100 }),
        fetchActiveCompanyBankAccounts(),
      ]);
      setHoldings(active.holdings);
      setDirectors(directorPage.items);
      setBanks(bankRows);
      setBankAccountId((current) => {
        if (current) return current;
        return (
          bankRows.find((bank) => bank.isDefault)?.id ?? bankRows[0]?.id ?? ''
        );
      });
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load capital form'));
    } finally {
      setLoading(false);
    }
  }, [caps.canPostCapital, caps.canView, isOnline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmPost = () => {
    if (!bankAccountId || totalAmount <= 0) {
      setError('Select a bank account with positive capital total');
      return;
    }
    Alert.alert(
      'Post share capital to bank book?',
      `This will debit the selected bank and credit Director Account for each director (total ${formatInr(
        totalAmount,
      )}), update paid-up capital, and show the amount in the bank book. It can only be posted once.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post to bank book',
          style: 'default',
          onPress: () => void submit(),
        },
      ],
    );
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await postShareCapitalReceipt({
        bankAccountId,
        receivedDate,
        reference: reference.trim() || null,
      });
      Alert.alert(
        'Posted',
        `Posted ${formatInr(result.totalAmount)} share capital${
          result.journalNumber ? ` (${result.journalNumber})` : ''
        }. Paid-up capital is now ${formatInr(result.paidUpShareCapital)}.`,
      );
      navigation.navigate('Shareholding');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not post share capital'));
    } finally {
      setSaving(false);
    }
  };

  if (!caps.canPostCapital) {
    return (
      <Screen title="Post share capital" subtitle="Permission required">
        <Text style={styles.error}>
          Requires company.update to post share capital into the bank book.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen title="Post share capital" subtitle="Bank book">
      {loading || forbidden ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          onRetry={() => void load()}
        />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.intro}>
            Cap table alone does not move money. This posts each
            director&apos;s capital (shares × face value) into the selected
            company bank account.
          </Text>

          {lines.map((line) => (
            <View key={line.directorId} style={styles.card}>
              <Text style={styles.code}>{line.label}</Text>
              <Text style={styles.meta}>
                {line.numberOfShares.toLocaleString('en-IN')} ×{' '}
                {formatInr(line.faceValue)} = {formatInr(line.amount)}
              </Text>
            </View>
          ))}

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total capital income</Text>
            <Text style={styles.totalValue}>{formatInr(totalAmount)}</Text>
          </View>

          <Text style={styles.label}>Bank account</Text>
          <View style={styles.chips}>
            {banks.map((bank) => (
              <Pressable
                key={bank.id}
                style={[
                  styles.chip,
                  bankAccountId === bank.id && styles.chipActive,
                ]}
                onPress={() => setBankAccountId(bank.id)}
              >
                <Text style={styles.chipText}>
                  {bank.bankName} · {bank.maskedAccountNumber}
                  {bank.isDefault ? ' (default)' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          {banks.length === 0 ? (
            <Text style={styles.meta}>No active company bank accounts.</Text>
          ) : null}

          <Text style={styles.label}>Received date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={receivedDate}
            onChangeText={setReceivedDate}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Reference (optional)</Text>
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Board resolution / receipt ref"
            placeholderTextColor={colors.textMuted}
          />

          <Pressable
            style={[
              styles.submit,
              (saving || !bankAccountId || totalAmount <= 0) && styles.disabled,
            ]}
            disabled={saving || !bankAccountId || totalAmount <= 0}
            onPress={confirmPost}
          >
            <Text style={styles.submitText}>
              {saving
                ? 'Posting…'
                : `Post ${formatInr(totalAmount)} to bank book`}
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 8,
  },
  code: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  totalCard: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: 14,
    marginVertical: 12,
  },
  totalLabel: { color: colors.textMuted, fontSize: 12 },
  totalValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
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
