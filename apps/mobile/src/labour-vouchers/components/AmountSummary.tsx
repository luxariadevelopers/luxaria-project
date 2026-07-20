import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { LabourVoucherAmounts } from '../types';

type Props = {
  amounts: LabourVoucherAmounts | null;
  reconcileOk: boolean;
};

function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AmountSummary({ amounts, reconcileOk }: Props) {
  if (!amounts) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>Enter quantity and rate to compute net</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Row label="Gross (qty × rate)" value={formatMoney(amounts.grossAmount)} />
      <Row label="Deductions" value={formatMoney(amounts.deductions)} />
      <Row label="Net payable" value={formatMoney(amounts.netAmount)} strong />
      <Text style={reconcileOk ? styles.ok : styles.bad}>
        {reconcileOk
          ? 'Net reconciles (gross − deductions)'
          : 'Net does not reconcile'}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, strong ? styles.strong : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { color: colors.textMuted, fontSize: 13, flex: 1 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600' },
  strong: { fontSize: 16, color: colors.primary },
  muted: { color: colors.textMuted, fontSize: 13 },
  ok: { color: colors.success, fontSize: 12, marginTop: 4 },
  bad: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
