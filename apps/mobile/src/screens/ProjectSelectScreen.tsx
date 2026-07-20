import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

export function ProjectSelectScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {
    projects,
    selectedProjectId,
    isLoading,
    setSelectedProjectId,
  } = useProject();

  return (
    <Screen
      title="Select project"
      subtitle="Choose a project before using site features"
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
            <Text style={styles.empty}>
              No projects found. Ask an admin to assign project access.
            </Text>
          }
          renderItem={({ item }) => {
            const selected = item.id === selectedProjectId;
            return (
              <Pressable
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => {
                  void (async () => {
                    await setSelectedProjectId(item.id);
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.replace('Tabs');
                    }
                  })();
                }}
              >
                <View>
                  <Text style={styles.code}>{item.projectCode}</Text>
                  <Text style={styles.name}>{item.projectName}</Text>
                </View>
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
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    color: colors.textMuted,
    marginTop: 24,
    lineHeight: 21,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  itemSelected: {
    borderColor: colors.primary,
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
});
