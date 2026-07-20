import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import { colors } from '@/theme/colors';

export function ProjectsScreen() {
  const {
    projects,
    selectedProjectId,
    isLoading,
    setSelectedProjectId,
  } = useProject();

  return (
    <Screen
      title="Projects"
      subtitle="Select the site project you are working on"
      scroll={false}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No projects available for your account.</Text>
          }
          renderItem={({ item }) => {
            const selected = item.id === selectedProjectId;
            return (
              <Pressable
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => void setSelectedProjectId(item.id)}
              >
                <View>
                  <Text style={styles.code}>{item.projectCode}</Text>
                  <Text style={styles.name}>{item.projectName}</Text>
                </View>
                {selected ? <Text style={styles.badge}>Selected</Text> : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    color: colors.textMuted,
    marginTop: 24,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8EEF1',
  },
  code: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  name: {
    color: colors.text,
    fontSize: 15,
  },
  badge: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
});
