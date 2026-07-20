import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { listMaterialIssues } from '@/features/material-issue/api';
import {
  MaterialIssueStatus,
  type PublicMaterialIssue,
} from '@/features/material-issue/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'MaterialIssue'>;

export function MaterialIssueScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = hasPermission('stock.view');
  const canReturn = hasPermission('stock.issue');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [issues, setIssues] = useState<PublicMaterialIssue[]>([]);

  const load = useCallback(async () => {
    if (!canView) {
      setForbidden(true);
      setIssues([]);
      return;
    }
    if (!selectedProject?.id) {
      setError('Select a project first');
      setIssues([]);
      return;
    }
    if (!isOnline) {
      setError('Connect online to refresh confirmed issues for return.');
      return;
    }

    setLoading(true);
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
    }
  }, [canView, isOnline, selectedProject?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!canView && !canReturn) {
    return (
      <Screen title="Material issue" subtitle="Permission required">
        <Text style={styles.error}>
          You need stock.view or stock.issue to use material issue.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Material issue"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · site stock issue & return`
          : 'Select a project first'
      }
    >
      {canReturn ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MaterialReturn', {})}
        >
          <Text style={styles.primaryButtonText}>Return unused material</Text>
        </Pressable>
      ) : (
        <Text style={styles.meta}>
          stock.issue is required to post material returns.
        </Text>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Confirmed issues</Text>
        <Pressable onPress={() => void load()} disabled={loading}>
          <Text style={styles.link}>{loading ? 'Loading…' : 'Retry'}</Text>
        </Pressable>
      </View>

      {forbidden ? (
        <Text style={styles.error}>
          Permission denied — stock.view is required to list issues.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}

      {!loading && !forbidden && !error && issues.length === 0 ? (
        <Text style={styles.empty}>
          No confirmed material issues with outstanding stock for this project.
        </Text>
      ) : null}

      {issues.map((issue) => {
        const outstanding = issue.items.reduce(
          (sum, item) => sum + item.remainingBaseQuantity,
          0,
        );
        return (
          <Pressable
            key={issue.id}
            style={styles.card}
            disabled={!canReturn || outstanding <= 0}
            onPress={() =>
              navigation.navigate('MaterialReturn', { issueId: issue.id })
            }
          >
            <Text style={styles.cardTitle}>{issue.issueNumber}</Text>
            <Text style={styles.meta}>
              {issue.workLocation} · outstanding {outstanding}
            </Text>
            {canReturn && outstanding > 0 ? (
              <Text style={styles.link}>Return from this issue</Text>
            ) : (
              <Text style={styles.meta}>Nothing outstanding to return</Text>
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#F4F0E6',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 13,
  },
  empty: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    marginBottom: 10,
    lineHeight: 20,
  },
  spinner: { marginVertical: 16 },
});
