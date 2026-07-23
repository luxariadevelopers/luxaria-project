import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { getPettyCashRequirement } from './api';
import { resolvePettyCashCapabilities } from './permissions';
import {
  requestNumberOf,
  type PublicPettyCashRequirement,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashDetail'>;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function PettyCashDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicPettyCashRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing petty_cash.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItem(await getPettyCashRequirement(requestId));
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load request'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, isOnline, requestId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Petty cash"
      subtitle={item ? requestNumberOf(item) : requestId}
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
        <FormSection title="Request">
          <Field label="Status" value={item.status} />
          <Field
            label="Week"
            value={`${String(item.weekStartDate).slice(0, 10)} → ${String(item.weekEndDate).slice(0, 10)}`}
          />
          <Field label="Justification" value={item.justification} />
          {item.previousUnsettledAmount != null &&
          item.previousUnsettledAmount > 0 ? (
            <Field
              label="Previous unsettled"
              value={formatInr(item.previousUnsettledAmount)}
            />
          ) : null}
        </FormSection>
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
});
