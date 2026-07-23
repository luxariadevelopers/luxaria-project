import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';
import { fetchUsers } from './api';
import { resolveUserAdminCapabilities } from './permissions';
import { UserStatus, type PublicUser } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'UsersList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'locked') return 'danger';
  if (s === 'inactive') return 'warning';
  return 'default';
}

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
    <ListScreen
      title="Users"
      subtitle="Admin · accounts & access"
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('UserForm', {})}
            style={{ minWidth: 88 }}
          />
        ) : null
      }
      header={
        <ListScreenHeader>
          <TextField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email, mobile…"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void load('initial')}
            containerStyle={styles.search}
          />
          <View style={styles.chips}>
            {(
              [
                { value: '' as const, label: 'All' },
                { value: UserStatus.Active, label: 'Active' },
                { value: UserStatus.Inactive, label: 'Inactive' },
                { value: UserStatus.Locked, label: 'Locked' },
              ] as const
            ).map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={statusFilter === option.value}
                onPress={() => setStatusFilter(option.value)}
              />
            ))}
            <Button
              label="Apply"
              variant="secondary"
              onPress={() => void load('initial')}
              style={styles.apply}
            />
          </View>
        </ListScreenHeader>
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No users found"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={`${item.userCode} · ${item.fullName}`}
          meta={`${item.department ? `${item.department} · ` : ''}${
            item.employeeId ? `${item.employeeId} · ` : ''
          }${item.email ?? item.mobile ?? 'No login contact'}`}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('UserDetail', { userId: item.id })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  apply: { minWidth: 88 },
});
