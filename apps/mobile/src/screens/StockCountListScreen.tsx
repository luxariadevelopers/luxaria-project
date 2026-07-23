import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import {
  canCreateSubmitStockCounts,
  canViewStockCounts,
  fetchStockCounts,
  type PublicStockCount,
} from '@/stock-count';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'StockCountList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const value = status.toLowerCase();
  if (value === 'submitted' || value === 'approved') return 'success';
  if (value === 'draft') return 'warning';
  if (value === 'rejected' || value === 'cancelled') return 'danger';
  return 'default';
}

export function StockCountListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = canViewStockCounts(hasPermission);
  const canCreate = canCreateSubmitStockCounts(hasPermission);

  const [items, setItems] = useState<PublicStockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('You need Nest permission stock.view to list stock counts.');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError(null);
        setItems([]);
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const page = await fetchStockCounts({
          projectId: selectedProject.id,
          limit: 50,
          sortOrder: 'desc',
        });
        setItems(page.items);
      } catch (err) {
        if (isForbiddenError(err)) {
          setForbidden(true);
          setError(null);
        } else {
          setError(getErrorMessage(err, 'Could not load stock counts'));
        }
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, isOnline, selectedProject?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ListScreen
      title="Stock Count"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · physical inventory`
          : 'Select a project first'
      }
      rightSlot={
        canCreate ? (
          <Button
            label="New count"
            variant="secondary"
            onPress={() => navigation.navigate('StockCountEntry')}
            style={{ minWidth: 110 }}
          />
        ) : null
      }
      header={
        !isOnline ? (
          <ListScreenHeader>
            <Text style={styles.bannerText}>
              Offline — open a new count from a cached draft, or go online to
              refresh the list.
            </Text>
            {canCreate ? (
              <Button
                label="Open count entry"
                onPress={() => navigation.navigate('StockCountEntry')}
              />
            ) : null}
          </ListScreenHeader>
        ) : null
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading && isOnline}
      refreshing={refreshing}
      onRefresh={isOnline ? () => void load('refresh') : undefined}
      error={error}
      forbidden={forbidden}
      emptyLabel={
        isOnline
          ? 'No stock counts yet — capture a physical count with photos'
          : 'Go online to refresh, or open count entry for a draft'
      }
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.countNumber}
          meta={`${item.location ? `${item.location} · ` : ''}${item.items.length} lines`}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('StockCountEntry', { countId: item.id })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  bannerText: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
});
