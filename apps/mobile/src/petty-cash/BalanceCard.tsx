import { StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@/format';
import { colors } from '@/theme/colors';
import {
  CashAccountStatus,
  type CashBalanceView,
  type PublicCashAccount,
} from './types';

type Props = {
  accounts: readonly PublicCashAccount[];
  balances: readonly CashBalanceView[] | undefined;
  loading?: boolean;
  /** Sum of previous unsettled amounts from open requests (optional). */
  previousUnsettledTotal?: number;
};

/**
 * Site cash position — totals from per-account `GET …/balance`
 * (clone of web `CashBalanceCards`).
 */
export function BalanceCard({
  accounts,
  balances,
  loading,
  previousUnsettledTotal = 0,
}: Props) {
  if (loading && !balances) {
    return (
      <View style={styles.wrap} testID="cash-balance-cards">
        <Text style={styles.muted}>Loading cash balances…</Text>
      </View>
    );
  }

  const byId = new Map((balances ?? []).map((b) => [b.cashAccountId, b]));
  const open = accounts.filter((a) => a.status !== CashAccountStatus.Closed);

  let totalBalance = 0;
  let needsReplenishment = 0;
  let overLimit = 0;
  let negative = 0;
  let withBalance = 0;

  for (const acc of open) {
    const bal = byId.get(acc.id);
    if (!bal) continue;
    withBalance += 1;
    totalBalance += bal.currentBalance;
    if (bal.needsReplenishment) needsReplenishment += 1;
    if (bal.isOverLimit) overLimit += 1;
    if (bal.isNegative) negative += 1;
  }

  const pendingHandover = accounts.filter(
    (a) => a.status === CashAccountStatus.PendingHandover,
  ).length;

  const fields = [
    {
      id: 'total',
      label: 'Open cash balance',
      value: formatInr(totalBalance),
    },
    {
      id: 'accounts',
      label: 'Open accounts',
      value: String(open.length),
    },
    {
      id: 'handover',
      label: 'Pending handover',
      value: String(pendingHandover),
    },
    {
      id: 'replenish',
      label: 'Needs replenishment',
      value: String(needsReplenishment),
    },
  ];

  return (
    <View style={styles.wrap} testID="cash-balance-cards">
      <Text style={styles.overline}>Site cash position</Text>
      <View style={styles.grid}>
        {fields.map((field) => (
          <View key={field.id} style={styles.field}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{field.value}</Text>
          </View>
        ))}
      </View>

      {previousUnsettledTotal > 0 ? (
        <View style={styles.alertWarn}>
          <Text style={styles.alertText}>
            Previous unsettled cash: {formatInr(previousUnsettledTotal)}
          </Text>
        </View>
      ) : null}

      {needsReplenishment > 0 ? (
        <View style={styles.alertWarn}>
          <Text style={styles.alertText}>
            {needsReplenishment} account(s) need replenishment.
          </Text>
        </View>
      ) : null}

      {withBalance === 0 && open.length > 0 ? (
        <View style={styles.alertInfo}>
          <Text style={styles.alertText}>
            Balances could not be loaded for the listed accounts.
          </Text>
        </View>
      ) : null}

      {negative > 0 || overLimit > 0 ? (
        <View style={negative > 0 ? styles.alertError : styles.alertWarn}>
          <Text style={styles.alertText}>
            {negative > 0
              ? `${negative} account(s) show a negative balance.`
              : ''}
            {negative > 0 && overLimit > 0 ? ' ' : ''}
            {overLimit > 0
              ? `${overLimit} account(s) are over the holding limit.`
              : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 14,
  },
  overline: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    backgroundColor: colors.background,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  fieldValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  alertWarn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#B8860B',
    padding: 10,
  },
  alertError: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#B00020',
    padding: 10,
  },
  alertInfo: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  alertText: { color: colors.text, fontSize: 13, lineHeight: 18 },
});
