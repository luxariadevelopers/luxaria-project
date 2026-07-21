import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors } from '@/theme/colors';
import {
  createLabourAttendance,
  listContractorsForAttendance,
  listLabourCategories,
} from './api';
import { buildAttendanceOfflineEnqueue } from './buildAttendanceOfflineEnqueue';
import { resolveAttendanceCapabilities } from './permissions';
import {
  LabourAttendanceEntryMode,
  type ContractorOption,
  type LabourCategoryOption,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourAttendanceForm'>;

export function LabourAttendanceFormScreen({ navigation }: Props) {
  const { hasPermission, user } = useAuth();
  const caps = resolveAttendanceCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();

  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [categories, setCategories] = useState<LabourCategoryOption[]>([]);
  const [contractorId, setContractorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [workLocation, setWorkLocation] = useState('');
  const [workerCount, setWorkerCount] = useState('10');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = useCallback(async () => {
    if (!isOnline || !selectedProject?.id) return;
    try {
      const [cRows, catRows] = await Promise.all([
        listContractorsForAttendance({ projectId: selectedProject.id }),
        listLabourCategories(),
      ]);
      setContractors(cRows);
      setCategories(catRows);
      if (!contractorId && cRows[0]) setContractorId(cRows[0].id);
      if (!categoryId && catRows[0]) setCategoryId(catRows[0].id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load contractors/categories'));
    }
  }, [categoryId, contractorId, isOnline, selectedProject?.id]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  if (!caps.canCreate) {
    return (
      <Screen title="New attendance" subtitle="Permission required">
        <Text style={styles.error}>
          You need attendance.create to submit labour attendance.
        </Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!selectedProject?.id) {
      setError('Select a project first');
      return;
    }
    if (!contractorId || !categoryId) {
      setError('Contractor and labour category are required');
      return;
    }
    const count = Number(workerCount);
    if (!Number.isFinite(count) || count <= 0) {
      setError('Worker count must be greater than 0');
      return;
    }

    const payload = {
      projectId: selectedProject.id,
      contractorId,
      attendanceDate,
      workLocation: workLocation.trim() || null,
      lines: [
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: count,
          overtimeHours: Number(overtimeHours) || 0,
        },
      ],
      remarks: remarks.trim() || null,
      submit: true,
      clientDeviceId: user?.id ?? null,
      offlineCapturedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    try {
      if (isOnline) {
        const created = await createLabourAttendance(
          payload,
          await Crypto.randomUUID(),
        );
        Alert.alert('Saved', `Attendance ${created.attendanceNumber} submitted`);
        navigation.replace('LabourAttendanceDetail', {
          attendanceId: created.id,
        });
      } else {
        await enqueue(buildAttendanceOfflineEnqueue(payload));
        Alert.alert('Queued', 'Attendance will sync when you are online');
        navigation.goBack();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save attendance'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="New attendance"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · ${isOnline ? 'online' : 'offline queue'}`
          : 'Select a project first'
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={attendanceDate}
        onChangeText={setAttendanceDate}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Contractor id</Text>
      <TextInput
        style={styles.input}
        value={contractorId}
        onChangeText={setContractorId}
        autoCapitalize="none"
        placeholder="Paste or pick below"
      />
      <View style={styles.chips}>
        {contractors.slice(0, 6).map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, contractorId === c.id && styles.chipActive]}
            onPress={() => setContractorId(c.id)}
          >
            <Text style={styles.chipText}>{c.contractorCode || c.legalName}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Labour category id</Text>
      <TextInput
        style={styles.input}
        value={categoryId}
        onChangeText={setCategoryId}
        autoCapitalize="none"
      />
      <View style={styles.chips}>
        {categories.slice(0, 6).map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipActive]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={styles.chipText}>
              {c.categoryCode || c.categoryName || c.id.slice(-6)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Worker count</Text>
      <TextInput
        style={styles.input}
        value={workerCount}
        onChangeText={setWorkerCount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Overtime hours</Text>
      <TextInput
        style={styles.input}
        value={overtimeHours}
        onChangeText={setOvertimeHours}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Work location</Text>
      <TextInput
        style={styles.input}
        value={workLocation}
        onChangeText={setWorkLocation}
      />

      <Text style={styles.label}>Remarks</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={remarks}
        onChangeText={setRemarks}
        multiline
      />

      <Pressable
        style={[styles.submit, saving && styles.disabled]}
        disabled={saving}
        onPress={() => void submit()}
      >
        <Text style={styles.submitText}>
          {saving ? 'Saving…' : isOnline ? 'Submit attendance' : 'Queue offline'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  submit: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
