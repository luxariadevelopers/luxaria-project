import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';

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
    <ListScreen
      title="Select project"
      subtitle="Choose a project before using site features"
      data={projects}
      keyExtractor={(item) => item.id}
      loading={isLoading}
      emptyLabel="No projects found. Ask an admin to assign project access."
      renderItem={({ item }) => {
        const selected = item.id === selectedProjectId;
        return (
          <ListRow
            title={item.projectCode}
            meta={item.projectName}
            status={selected ? 'Selected' : undefined}
            statusTone={selected ? 'success' : 'default'}
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
          />
        );
      }}
    />
  );
}
