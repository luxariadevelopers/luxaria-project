import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { formatInr } from '@/format';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
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
import { colors, spacing, typography } from '@/theme';
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
          <FormSection
            title="Share capital"
            description="Cap table alone does not move money. This posts each director's capital (shares × face value) into the selected company bank account."
            framed={false}
          >
            {lines.map((line) => (
              <ListRow
                key={line.directorId}
                title={line.label}
                meta={`${line.numberOfShares.toLocaleString('en-IN')} × ${formatInr(line.faceValue)} = ${formatInr(line.amount)}`}
              />
            ))}
          </FormSection>

          <FormSection title="Total capital income">
            <Text style={styles.totalValue}>{formatInr(totalAmount)}</Text>
          </FormSection>

          <FormSection title="Bank posting">
            <Text style={styles.label}>Bank account</Text>
            <View style={styles.chips}>
              {banks.map((bank) => (
                <Chip
                  key={bank.id}
                  label={`${bank.bankName} · ${bank.maskedAccountNumber}${
                    bank.isDefault ? ' (default)' : ''
                  }`}
                  selected={bankAccountId === bank.id}
                  onPress={() => setBankAccountId(bank.id)}
                />
              ))}
            </View>
            {banks.length === 0 ? (
              <Text style={styles.meta}>No active company bank accounts.</Text>
            ) : null}

            <TextField
              label="Received date (YYYY-MM-DD)"
              value={receivedDate}
              onChangeText={setReceivedDate}
              autoCapitalize="none"
            />
            <TextField
              label="Reference (optional)"
              value={reference}
              onChangeText={setReference}
              placeholder="Board resolution / receipt ref"
            />
          </FormSection>

          <Button
            label={`Post ${formatInr(totalAmount)} to bank book`}
            loading={saving}
            disabled={saving || !bankAccountId || totalAmount <= 0}
            onPress={confirmPost}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  meta: { ...typography.meta, marginTop: spacing.xs, fontSize: 13 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  totalValue: {
    ...typography.bodyStrong,
    fontSize: 18,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
