import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors, spacing } from '@/theme';
import {
  createLabourAttendance,
  listContractorsForAttendance,
  listLabourCategories,
} from './api';
import {
  buildAttendanceCreatePayload,
  type AttendanceWorkerDraft,
} from './buildAttendanceCreatePayload';
import { buildAttendanceOfflineEnqueue } from './buildAttendanceOfflineEnqueue';
import { IndividualAttendanceSection } from './IndividualAttendanceSection';
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
  const [entryMode, setEntryMode] = useState<LabourAttendanceEntryMode>(
    LabourAttendanceEntryMode.Group,
  );
  const [workLocation, setWorkLocation] = useState('');
  const [workerCount, setWorkerCount] = useState('10');
  const [workers, setWorkers] = useState<AttendanceWorkerDraft[]>([
    {
      workerName: '',
      workerCode: '',
      checkIn: '',
      checkOut: '',
      overtimeHours: '0',
      remarks: '',
    },
  ]);
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
        <AsyncStatePanel
          forbidden
          error="You need attendance.create to submit labour attendance."
        />
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

    let payload;
    try {
      payload = buildAttendanceCreatePayload({
        projectId: selectedProject.id,
        contractorId,
        attendanceDate,
        labourCategoryId: categoryId,
        entryMode,
        workerCount,
        workers,
        overtimeHours,
        workLocation: workLocation.trim() || null,
        remarks: remarks.trim() || null,
        submit: true,
        clientDeviceId: user?.id ?? null,
        offlineCapturedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid attendance');
      return;
    }

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

      <FormSection title="Basics">
        <TextField
          label="Date (YYYY-MM-DD)"
          value={attendanceDate}
          onChangeText={setAttendanceDate}
          autoCapitalize="none"
          containerStyle={styles.field}
        />
        <Text style={styles.chipLabel}>Entry mode</Text>
        <View style={styles.chips}>
          <Chip
            label="Group"
            selected={entryMode === LabourAttendanceEntryMode.Group}
            onPress={() => setEntryMode(LabourAttendanceEntryMode.Group)}
          />
          <Chip
            label="Individual"
            selected={entryMode === LabourAttendanceEntryMode.Individual}
            onPress={() => setEntryMode(LabourAttendanceEntryMode.Individual)}
          />
        </View>
      </FormSection>

      <FormSection title="Contractor & category">
        <TextField
          label="Contractor id"
          value={contractorId}
          onChangeText={setContractorId}
          autoCapitalize="none"
          placeholder="Paste or pick below"
          containerStyle={styles.field}
        />
        <View style={styles.chips}>
          {contractors.slice(0, 6).map((c) => (
            <Chip
              key={c.id}
              label={c.contractorCode || c.legalName}
              selected={contractorId === c.id}
              onPress={() => setContractorId(c.id)}
            />
          ))}
        </View>
        <TextField
          label="Labour category id"
          value={categoryId}
          onChangeText={setCategoryId}
          autoCapitalize="none"
          containerStyle={styles.field}
        />
        <View style={styles.chips}>
          {categories.slice(0, 6).map((c) => (
            <Chip
              key={c.id}
              label={c.categoryCode || c.categoryName || c.id.slice(-6)}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>
      </FormSection>

      <FormSection title="Headcount">
        {entryMode === LabourAttendanceEntryMode.Group ? (
          <>
            <TextField
              label="Worker count"
              value={workerCount}
              onChangeText={setWorkerCount}
              keyboardType="numeric"
              containerStyle={styles.field}
            />
            <TextField
              label="Overtime hours"
              value={overtimeHours}
              onChangeText={setOvertimeHours}
              keyboardType="numeric"
              containerStyle={styles.fieldLast}
            />
          </>
        ) : (
          <>
            <IndividualAttendanceSection
              workers={workers}
              onChange={setWorkers}
            />
            <TextField
              label="Line overtime hours (optional)"
              value={overtimeHours}
              onChangeText={setOvertimeHours}
              keyboardType="numeric"
              containerStyle={styles.fieldLast}
            />
          </>
        )}
      </FormSection>

      <FormSection title="Notes">
        <TextField
          label="Work location"
          value={workLocation}
          onChangeText={setWorkLocation}
          containerStyle={styles.field}
        />
        <TextField
          label="Remarks"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          style={styles.multiline}
          containerStyle={styles.fieldLast}
        />
      </FormSection>

      <Button
        label={
          saving ? 'Saving…' : isOnline ? 'Submit attendance' : 'Queue offline'
        }
        loading={saving}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  fieldLast: {
    marginBottom: 0,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
