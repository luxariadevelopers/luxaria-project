import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
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

const asyncDraftStorage: DraftStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

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

  const tabs = (
    <View style={styles.tabs}>
      <Pressable
        style={[styles.tab, tab === 'server' && styles.tabActive]}
        onPress={() => setTab('server')}
      >
        <Text style={styles.tabText}>Server</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, tab === 'drafts' && styles.tabActive]}
        onPress={() => setTab('drafts')}
      >
        <Text style={styles.tabText}>
          Drafts{drafts.length > 0 ? ` (${drafts.length})` : ''}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Screen
      title="Site expenses"
      subtitle={selectedProject ? selectedProject.projectCode : 'Select a project'}
      scroll={false}
      rightSlot={caps.canCreate ? (
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate('SiteExpenseForm')}>
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      ) : null}
    >
      {tabs}
      {tab === 'server' ? (
        <>
          {loading || error || forbidden || (!loading && items.length === 0) ? (
            <AsyncStatePanel
              loading={loading}
              error={error}
              forbidden={forbidden}
              empty={!loading && !error && !forbidden && items.length === 0}
              emptyLabel="No site expenses yet"
              onRetry={() => void load('initial')}
            />
          ) : null}
          {!loading && !error && !forbidden && items.length > 0 ? (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void load('refresh')}
                  tintColor={colors.primary}
                />
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  onPress={() => navigation.navigate('SiteExpenseDetail', { expenseId: item.id })}
                >
                  <Text style={styles.code}>{item.voucherNumber}</Text>
                  <Text style={styles.meta}>{item.paidTo} · ₹{item.amount} · {item.status}</Text>
                  <Text style={styles.meta}>{String(item.expenseDate).slice(0, 10)} · {item.purpose}</Text>
                </Pressable>
              )}
            />
          ) : null}
        </>
      ) : drafts.length === 0 ? (
        <AsyncStatePanel empty emptyLabel="No local drafts" />
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                onPress={() =>
                  navigation.navigate('SiteExpenseForm', { draftId: item.id })
                }
              >
                <Text style={styles.code}>
                  {item.paidTo.trim() || 'Untitled draft'}
                </Text>
                <Text style={styles.meta}>
                  {item.expenseDate} · {item.amount ? `₹${item.amount}` : 'No amount'}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.purpose.trim() || 'No purpose yet'}
                </Text>
                <Text style={styles.draftHint}>
                  Local draft · updated {String(item.updatedAt).slice(0, 16).replace('T', ' ')}
                </Text>
              </Pressable>
              <View style={styles.draftActions}>
                <Pressable
                  style={styles.resumeBtn}
                  onPress={() =>
                    navigation.navigate('SiteExpenseForm', { draftId: item.id })
                  }
                >
                  <Text style={styles.resumeBtnText}>Resume</Text>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => deleteDraft(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  newBtnText: { color: '#F4F0E6', fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: { borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 10 },
  code: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  draftHint: { color: colors.textMuted, marginTop: 6, fontSize: 12 },
  draftActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  resumeBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resumeBtnText: { color: '#F4F0E6', fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.text, fontWeight: '600' },
});
