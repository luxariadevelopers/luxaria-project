import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';
import { listSiteExpenses } from './api';
import {
  clearSiteExpenseDraft,
  loadSiteExpenseDrafts,
  type DraftStorage,
} from './draftStore';
import { resolveExpenseCapabilities } from './permissions';
import type { PublicSiteExpenseVoucher, SiteExpenseLocalDraft } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'SiteExpenseList'>;
type Tab = 'server' | 'drafts';
type ListItem =
  | { kind: 'server'; row: PublicSiteExpenseVoucher }
  | { kind: 'draft'; row: SiteExpenseLocalDraft };

const asyncDraftStorage: DraftStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s === 'posted' || s === 'approved') return 'success';
  if (s === 'submitted' || s === 'pending' || s === 'verified') return 'warning';
  if (s === 'rejected' || s === 'cancelled') return 'danger';
  return 'default';
}

export function SiteExpenseListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [tab, setTab] = useState<Tab>('server');
  const [items, setItems] = useState<PublicSiteExpenseVoucher[]>([]);
  const [drafts, setDrafts] = useState<SiteExpenseLocalDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadDrafts = useCallback(async () => {
    if (!selectedProject?.id) {
      setDrafts([]);
      return;
    }
    setDrafts(await loadSiteExpenseDrafts(selectedProject.id, asyncDraftStorage));
  }, [selectedProject?.id]);

  const loadServer = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing expense.view');
      setLoading(false);
      return;
    }
    if (!selectedProject?.id) {
      setError('Select a project first');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to load site expenses');
      setLoading(false);
      return;
    }
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setItems(await listSiteExpenses({ projectId: selectedProject.id }));
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load expenses'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [caps.canView, isOnline, selectedProject?.id]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    await loadDrafts();
    if (tab === 'server') {
      await loadServer(mode);
      return;
    }
    setLoading(false);
    setRefreshing(false);
    setError(null);
    setForbidden(false);
  }, [loadDrafts, loadServer, tab]);

  useFocusEffect(useCallback(() => { void load('initial'); }, [load]));

  const deleteDraft = (draft: SiteExpenseLocalDraft) => {
    Alert.alert('Delete draft?', 'This removes the local draft only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!selectedProject?.id) return;
            await clearSiteExpenseDraft(
              selectedProject.id,
              draft.id,
              asyncDraftStorage,
            );
            await loadDrafts();
          })();
        },
      },
    ]);
  };

  const listData: ListItem[] =
    tab === 'server'
      ? items.map((row) => ({ kind: 'server' as const, row }))
      : drafts.map((row) => ({ kind: 'draft' as const, row }));

  return (
    <ListScreen<ListItem>
      title="Site expenses"
      subtitle={selectedProject ? selectedProject.projectCode : 'Select a project'}
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('SiteExpenseForm')}
            style={{ minWidth: 72 }}
          />
        ) : null
      }
      header={
        <ListScreenHeader>
          <View style={styles.tabs}>
            <Chip
              label="Server"
              selected={tab === 'server'}
              onPress={() => setTab('server')}
              style={styles.tabChip}
            />
            <Chip
              label={
                drafts.length > 0 ? `Drafts (${drafts.length})` : 'Drafts'
              }
              selected={tab === 'drafts'}
              onPress={() => setTab('drafts')}
              style={styles.tabChip}
            />
          </View>
        </ListScreenHeader>
      }
      data={listData}
      keyExtractor={(item) => item.row.id}
      loading={tab === 'server' && loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={tab === 'server' ? error : null}
      forbidden={tab === 'server' && forbidden}
      emptyLabel={
        tab === 'server' ? 'No site expenses yet' : 'No local drafts'
      }
      onRetry={() => void load('initial')}
      renderItem={({ item }) => {
        if (item.kind === 'draft') {
          const draft = item.row;
          return (
            <View style={styles.draftBlock}>
              <ListRow
                title={draft.paidTo.trim() || 'Untitled draft'}
                meta={[
                  `${draft.expenseDate} · ${draft.amount ? `₹${draft.amount}` : 'No amount'}`,
                  draft.purpose.trim() || 'No purpose yet',
                  `Local draft · updated ${String(draft.updatedAt).slice(0, 16).replace('T', ' ')}`,
                ].join(' · ')}
                onPress={() =>
                  navigation.navigate('SiteExpenseForm', { draftId: draft.id })
                }
              />
              <View style={styles.draftActions}>
                <Button
                  label="Resume"
                  onPress={() =>
                    navigation.navigate('SiteExpenseForm', {
                      draftId: draft.id,
                    })
                  }
                  style={styles.draftBtn}
                />
                <Button
                  label="Delete"
                  variant="secondary"
                  onPress={() => deleteDraft(draft)}
                  style={styles.draftBtn}
                />
              </View>
            </View>
          );
        }

        const expense = item.row;
        return (
          <ListRow
            title={expense.voucherNumber}
            meta={`${expense.paidTo} · ₹${expense.amount} · ${String(expense.expenseDate).slice(0, 10)} · ${expense.purpose}`}
            status={expense.status}
            statusTone={statusTone(expense.status)}
            onPress={() =>
              navigation.navigate('SiteExpenseDetail', {
                expenseId: expense.id,
              })
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
  },
  draftBlock: {
    marginBottom: spacing.sm,
  },
  draftActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  draftBtn: {
    flex: 1,
  },
});
