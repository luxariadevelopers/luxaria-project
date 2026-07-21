import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import { useSite } from '@/context/SiteContext';
import { useOfflineSync } from '@/offline/OfflineSyncContext';
import { buildDprOfflineEnqueue } from '@/features/dpr/buildDprOfflineEnqueue';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  pickImageFromCamera,
  pickImageFromLibrary,
  type LocalFile,
} from '@/utils/fileUpload';

type Props = NativeStackScreenProps<AppStackParamList, 'DailyProgressReport'>;

const WEATHER_OPTIONS = [
  'clear',
  'cloudy',
  'rain',
  'storm',
  'hot',
  'fog',
  'other',
] as const;

export function DailyProgressReportScreen({ navigation }: Props) {
  const { selectedProject } = useProject();
  const { selectedSite } = useSite();
  const { enqueue } = useOfflineSync();
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [weather, setWeather] =
    useState<(typeof WEATHER_OPTIONS)[number]>('clear');
  const [labourCount, setLabourCount] = useState('0');
  const [workPerformed, setWorkPerformed] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [siteCashBalance, setSiteCashBalance] = useState('0');
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [saving, setSaving] = useState(false);

  async function onPickPhotos() {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Camera',
        onPress: async () => {
          const file = await pickImageFromCamera();
          if (file) setPhotos((prev) => [...prev, file]);
        },
      },
      {
        text: 'Library',
        onPress: async () => {
          const file = await pickImageFromLibrary();
          if (file) setPhotos((prev) => [...prev, file]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function onQueueSubmit() {
    if (!selectedProject?.id) {
      Alert.alert('Select a project first');
      return;
    }
    if (!selectedSite?.id) {
      Alert.alert('Select a site first');
      return;
    }
    try {
      setSaving(true);
      const entry = buildDprOfflineEnqueue({
        projectId: selectedProject.id,
        siteId: selectedSite.id,
        reportDate,
        weather,
        labourCount: Number(labourCount) || 0,
        workPerformed,
        tomorrowPlan,
        siteCashBalance: Number(siteCashBalance) || 0,
        photos,
      });
      await enqueue(entry);
      Alert.alert(
        'Queued',
        'DPR saved offline and will sync when online.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        'Could not queue DPR',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Daily Progress Report"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
          : 'No project selected'
      }
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.meta}>
          {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'No project selected'}
        </Text>

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={reportDate}
          onChangeText={setReportDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Weather</Text>
        <View style={styles.row}>
          {WEATHER_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.chip,
                weather === option && styles.chipActive,
              ]}
              onPress={() => setWeather(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  weather === option && styles.chipTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Labour count</Text>
        <TextInput
          style={styles.input}
          value={labourCount}
          onChangeText={setLabourCount}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Work performed</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={workPerformed}
          onChangeText={setWorkPerformed}
          multiline
        />

        <Text style={styles.label}>Tomorrow plan</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={tomorrowPlan}
          onChangeText={setTomorrowPlan}
          multiline
        />

        <Text style={styles.label}>Site cash balance</Text>
        <TextInput
          style={styles.input}
          value={siteCashBalance}
          onChangeText={setSiteCashBalance}
          keyboardType="decimal-pad"
        />

        <Pressable style={styles.secondaryButton} onPress={onPickPhotos}>
          <Text style={styles.secondaryButtonText}>
            Photos ({photos.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, saving && styles.disabled]}
          disabled={saving}
          onPress={onQueueSubmit}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Queuing…' : 'Save offline & submit'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  meta: { color: colors.textMuted, marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { color: colors.text, fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
