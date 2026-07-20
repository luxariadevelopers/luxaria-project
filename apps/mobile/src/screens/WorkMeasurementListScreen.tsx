import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchWorkMeasurements } from '@/work-measurement/api';
import { MeasurementRow } from '@/work-measurement/components/MeasurementRow';
import {
  EmptyPanel,
  ErrorPanel,
  ForbiddenPanel,
  LoadingPanel,
} from '@/work-measurement/components/StatePanels';
import { resolveWorkMeasurementCapabilities } from '@/work-measurement/permissions';
import type { PublicWorkMeasurement } from '@/work-measurement/types';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkMeasurementList'>;

export function WorkMeasurementListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const caps = resolveWorkMeasurementCapabilities(hasPermission);

  const [items, setItems] = useState<PublicWorkMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        return;
      }
      if (!selectedProject?.id) {
        setItems([]);
        setError(null);
        return;
      }
      if (!isOnline) {
        setError(
          new Error(
            'Work measurements require a network connection to load. Capture new measurements offline from New measurement.',
          ),
        );
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await fetchWorkMeasurements({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(result.items);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, isOnline, selectedProject?.id],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  if (!caps.canView) {
    return (
      <Screen title="Work Measurement" subtitle="Site quantities">
        <ForbiddenPanel message="Missing permission measurement.view" />
      </Screen>
    );
  }

  return (
    <Screen
      title="Work Measurement"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · verified quantities with evidence`
          : 'Select a project first'
      }
      scroll={false}
      rightSlot={
        caps.canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('WorkMeasurementForm')}
          >
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        ) : null
      }
    >
      {!selectedProject ? (
        <EmptyPanel
          title="No project selected"
          description="Choose an active project before listing measurements."
          actionLabel="Select project"
          onAction={() => navigation.navigate('ProjectSelect')}
        />
      ) : loading && items.length === 0 ? (
        <LoadingPanel label="Loading measurements…" />
      ) : error ? (
        <ErrorPanel error={error} onRetry={() => void load('initial')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyPanel
              title="No measurements yet"
              description="Capture site quantities with photos for later engineer verification."
              actionLabel={caps.canCreate ? 'New measurement' : undefined}
              onAction={
                caps.canCreate
                  ? () => navigation.navigate('WorkMeasurementForm')
                  : undefined
              }
            />
          }
          renderItem={({ item }) => <MeasurementRow item={item} />}
          ListFooterComponent={
            caps.canCreate ? (
              <View style={styles.footer}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('WorkMeasurementForm')}
                >
                  <Text style={styles.primaryButtonText}>New measurement</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: '#F4F0E6',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F4F0E6',
    fontWeight: '700',
  },
});
