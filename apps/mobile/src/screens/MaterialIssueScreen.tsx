import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { listMaterialIssues } from '@/features/material-issue/api';
import {
  MaterialIssueStatus,
  type PublicMaterialIssue,
} from '@/features/material-issue/types';
import type { AppStackParamList } from '@/navigation/types';
import { spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'MaterialIssue'>;

export function MaterialIssueScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = hasPermission('stock.view');
  const canReturn = hasPermission('stock.issue');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [issues, setIssues] = useState<PublicMaterialIssue[]>([]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setIssues([]);
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setIssues([]);
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Connect online to refresh confirmed issues for return.');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const rows = await listMaterialIssues({
          projectId: selectedProject.id,
          status: MaterialIssueStatus.Confirmed,
          limit: 50,
        });
        setIssues(rows);
      } catch (err) {
        if (isForbiddenError(err)) {
          setForbidden(true);
          setError(null);
        } else {
          setError(getErrorMessage(err, 'Could not load material issues'));
        }
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

  if (!canView && !canReturn) {
    return (
      <Screen title="Material issue" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="You need stock.view or stock.issue to use material issue."
        />
      </Screen>
    );
  }

  return (
    <ListScreen
      title="Material issue"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · site stock issue & return`
          : 'Select a project first'
      }
      header={
        <ListScreenHeader>
          {canReturn ? (
            <>
              <Button
                label="Issue material to site"
                onPress={() => navigation.navigate('MaterialIssueForm')}
              />
              <Button
                label="Return unused material"
                variant="secondary"
                onPress={() => navigation.navigate('MaterialReturn', {})}
              />
            </>
          ) : (
            <Text style={styles.meta}>
              stock.issue is required to post material returns.
            </Text>
          )}
          <Text style={styles.sectionTitle}>Confirmed issues</Text>
        </ListScreenHeader>
      }
      data={issues}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No confirmed material issues with outstanding stock for this project."
      onRetry={() => void load('initial')}
      renderItem={({ item }) => {
        const outstanding = item.items.reduce(
          (sum, row) => sum + row.remainingBaseQuantity,
          0,
        );
        const canOpen = canReturn && outstanding > 0;
        return (
          <ListRow
            title={item.issueNumber}
            meta={`${item.workLocation} · outstanding ${outstanding}${canOpen ? '' : ' · nothing to return'}`}
            onPress={
              canOpen
                ? () =>
                    navigation.navigate('MaterialReturn', {
                      issueId: item.id,
                    })
                : undefined
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  meta: {
    ...typography.meta,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 17,
    marginTop: spacing.sm,
  },
});
