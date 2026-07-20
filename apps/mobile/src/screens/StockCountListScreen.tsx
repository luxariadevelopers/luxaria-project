import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import {
  canCreateSubmitStockCounts,
  canViewStockCounts,
  fetchStockCounts,
  type PublicStockCount,
} from '@/stock-count';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'StockCountList'>;

export function StockCountListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = canViewStockCounts(hasPermission);
  const canCreate = canCreateSubmitStockCounts(hasPermission);

  const [items, setItems] = useState<PublicStockCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setForbidden(true);
      setItems([]);
      return;
    }
    if (!selectedProject?.id) {
      setError('Select a project first');
      setItems([]);
      return;
    }
    if (!isOnline) {
      setError(null);
      setItems([]);
      return;
    }

    setLoading(true);
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
    }
  }, [canView, isOnline, selectedProject?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!canView || forbidden) {
    return (
      <Screen title="Stock Count" subtitle="Physical inventory counts">
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Permission required</Text>
          <Text style={styles.panelBody}>
            You need Nest permission `stock.view` to list stock counts.
          </Text>
        </View>
      </Screen>
    );
  }

  if (loading && items.length === 0) {
    return <LoadingScreen label="Loading stock counts…" />;
  }

  return (
    <Screen
      title="Stock Count"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · Home › Stock Count`
          : 'Select a project first'
      }
      scroll={false}
      rightSlot={
        canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('StockCountEntry')}
          >
            <Text style={styles.newBtnText}>New count</Text>
          </Pressable>
        ) : null
      }
    >
      {!isOnline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Offline — open a new count from a cached draft, or go online to
            refresh the list.
          </Text>
          {canCreate ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('StockCountEntry')}
            >
              <Text style={styles.primaryBtnText}>Open count entry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Could not load</Text>
          <Text style={styles.panelBody}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && isOnline && items.length === 0 && !loading ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>No stock counts yet</Text>
          <Text style={styles.panelBody}>
            Capture a physical count with photos, then submit offline when
            needed.
          </Text>
          {canCreate ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('StockCountEntry')}
            >
              <Text style={styles.primaryBtnText}>Start count</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('StockCountEntry', { countId: item.id })
            }
          >
            <Text style={styles.rowTitle}>{item.countNumber}</Text>
            <Text style={styles.rowMeta}>
              {item.status}
              {item.location ? ` · ${item.location}` : ''}
              {` · ${item.items.length} lines`}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: colors.primary, fontWeight: '700' },
  banner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: colors.textMuted, marginBottom: 10, lineHeight: 20 },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  panelTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  panelBody: { color: colors.textMuted, lineHeight: 20, marginBottom: 12 },
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryBtnText: { color: colors.primary, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#F4F0E6', fontWeight: '700' },
  list: { paddingBottom: 32, flexGrow: 1 },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
