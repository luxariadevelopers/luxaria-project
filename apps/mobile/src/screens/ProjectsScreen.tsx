import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

type ProjectsNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Projects'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigation>();
  const { hasPermission } = useAuth();
  const {
    projects,
    selectedProjectId,
    isLoading,
    setSelectedProjectId,
  } = useProject();
  const canViewDashboard = hasPermission('dashboard.view');

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
          ListHeaderComponent={
            selectedProjectId && canViewDashboard ? (
              <Pressable
                style={styles.dashboardButton}
                onPress={() => navigation.navigate('ProjectDashboard')}
              >
                <Text style={styles.dashboardButtonText}>
                  Open project dashboard
                </Text>
              </Pressable>
            ) : null
          }
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
  dashboardButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  dashboardButtonText: {
    color: '#F4F0E6',
    fontWeight: '700',
    textAlign: 'center',
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
