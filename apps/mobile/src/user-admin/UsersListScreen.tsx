import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchUsers } from './api';
import { resolveUserAdminCapabilities } from './permissions';
import { UserStatus, type PublicUser } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'UsersList'>;

export function UsersListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveUserAdminCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing user.view');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load users');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const result = await fetchUsers({
          page: 1,
          limit: 50,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          sortBy: 'fullName',
          sortOrder: 'asc',
        });
        setItems(result.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load users'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, isOnline, search, statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <Screen
      title="Users"
      subtitle="Admin · accounts & access"
      scroll={false}
      rightSlot={
        caps.canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('UserForm', {})}
          >
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        ) : null
      }
    >
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, mobile…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => void load('initial')}
        />
        <View style={styles.chips}>
          {(
            [
              { value: '', label: 'All' },
              { value: UserStatus.Active, label: 'Active' },
              { value: UserStatus.Inactive, label: 'Inactive' },
              { value: UserStatus.Locked, label: 'Locked' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.label}
              style={[
                styles.chip,
                statusFilter === option.value && styles.chipActive,
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text style={styles.chipText}>{option.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.chip} onPress={() => void load('initial')}>
            <Text style={styles.chipText}>Apply</Text>
          </Pressable>
        </View>
      </View>

      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && items.length === 0}
          emptyLabel="No users found"
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
              onPress={() =>
                navigation.navigate('UserDetail', { userId: item.id })
              }
            >
              <Text style={styles.code}>{item.userCode}</Text>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>
                {item.status}
                {item.department ? ` · ${item.department}` : ''}
                {item.employeeId ? ` · ${item.employeeId}` : ''}
              </Text>
              <Text style={styles.meta}>
                {item.email ?? item.mobile ?? 'No login contact'}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: '#F4F0E6', fontWeight: '700' },
  filters: { marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  code: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  name: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 2 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
