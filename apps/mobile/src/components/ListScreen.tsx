import type { ReactElement, ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '@/theme';
import { AsyncStatePanel } from './AsyncStatePanel';
import { Screen } from './Screen';

type Props<T> = {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  rightSlot?: ReactNode;
  /** Shown above the list (search, filters, chips). */
  header?: ReactNode;
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string | null;
  forbidden?: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
  listStyle?: StyleProp<ViewStyle>;
  ListEmptyComponent?: ReactElement | null;
};

export function ListScreen<T>({
  title,
  subtitle,
  showHeader,
  rightSlot,
  header,
  data,
  keyExtractor,
  renderItem,
  loading,
  refreshing,
  onRefresh,
  error,
  forbidden,
  emptyLabel = 'Nothing here yet',
  onRetry,
  listStyle,
  ListEmptyComponent,
}: Props<T>) {
  const showPanel =
    Boolean(loading) ||
    Boolean(error) ||
    Boolean(forbidden) ||
    (!loading && !error && !forbidden && data.length === 0);

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      showHeader={showHeader}
      rightSlot={rightSlot}
      scroll={false}
    >
      {header}
      {showPanel ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && data.length === 0}
          emptyLabel={emptyLabel}
          onRetry={onRetry}
        />
      ) : null}
      {!showPanel ? (
        <FlatList
          data={data as T[]}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, listStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
          ListEmptyComponent={ListEmptyComponent}
        />
      ) : null}
    </Screen>
  );
}

/** Spacer wrapper for custom content above a list. */
export function ListScreenHeader({ children }: { children?: ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
});
