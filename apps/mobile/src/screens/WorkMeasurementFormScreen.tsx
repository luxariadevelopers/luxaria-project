import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
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
import { colors, spacing, typography } from '@/theme';
import {
  pickImageFromCamera,
  pickImageFromLibrary,
  type LocalFile,
} from '@/utils/fileUpload';
import {
  fetchBoqItemsForMeasurement,
  fetchContractorsForMeasurement,
  fetchWorkMeasurements,
} from '@/work-measurement/api';
import { buildMeasurementOfflineEnqueue } from '@/work-measurement/buildMeasurementOfflineEnqueue';
import { resolveWorkMeasurementCapabilities } from '@/work-measurement/permissions';
import type {
  WorkMeasurementBoqItemOption,
  WorkMeasurementContractorOption,
} from '@/work-measurement/types';
import {
  computePreviousQuantity,
  roundQty,
  validateCumulativeWithinBoq,
  validateMeasurementForm,
} from '@/work-measurement/validation';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkMeasurementForm'>;

export function WorkMeasurementFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();
  const caps = resolveWorkMeasurementCapabilities(hasPermission);

  const [contractors, setContractors] = useState<
    WorkMeasurementContractorOption[]
  >([]);
  const [boqItems, setBoqItems] = useState<WorkMeasurementBoqItemOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupHint, setLookupHint] = useState<string | null>(null);

  const [contractorId, setContractorId] = useState('');
  const [boqItemId, setBoqItemId] = useState('');
  const [location, setLocation] = useState('');
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [currentQuantityText, setCurrentQuantityText] = useState('');
  const [drawingReference, setDrawingReference] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [previousQuantity, setPreviousQuantity] = useState(0);
  const [saving, setSaving] = useState(false);

  const selectedBoq = useMemo(
    () => boqItems.find((item) => item.id === boqItemId) ?? null,
    [boqItemId, boqItems],
  );

  const boqPlannedQuantity = selectedBoq?.plannedQuantity ?? 0;
  const currentQuantity = Number(currentQuantityText);
  const cumulativeCheck = validateCumulativeWithinBoq({
    previousQuantity,
    currentQuantity: Number.isFinite(currentQuantity) ? currentQuantity : 0,
    boqPlannedQuantity,
  });

  const loadLookups = useCallback(async () => {
    if (!selectedProject?.id || !caps.canCreate) {
      return;
    }
    if (!isOnline) {
      setLookupHint(
        'Load contractors and BOQ items while online, then capture offline.',
      );
      return;
    }

    setLoadingLookups(true);
    setLookupError(null);
    setLookupHint(null);
    try {
      const [contractorRows, boqRows] = await Promise.all([
        caps.canViewContractors
          ? fetchContractorsForMeasurement({ limit: 50 })
          : Promise.resolve([]),
        caps.canViewBoq
          ? fetchBoqItemsForMeasurement({
              projectId: selectedProject.id,
              limit: 50,
            })
          : Promise.resolve([]),
      ]);
      setContractors(contractorRows);
      setBoqItems(boqRows);
      if (!caps.canViewContractors || !caps.canViewBoq) {
        setLookupHint(
          'Enter contractor and BOQ item ids manually (missing contractor.view / boq.view).',
        );
      }
    } catch (error) {
      if (isForbiddenError(error)) {
        setLookupError(
          getErrorMessage(
            error,
            'Missing permission to load contractors or BOQ items',
          ),
        );
      } else {
        setLookupError(getErrorMessage(error, 'Could not load form lookups'));
      }
    } finally {
      setLoadingLookups(false);
    }
  }, [
    caps.canCreate,
    caps.canViewBoq,
    caps.canViewContractors,
    isOnline,
    selectedProject?.id,
  ]);

  const refreshPreviousQuantity = useCallback(async () => {
    if (!selectedProject?.id || !contractorId || !boqItemId || !isOnline) {
      return;
    }
    try {
      const result = await fetchWorkMeasurements({
        projectId: selectedProject.id,
        contractorId,
        boqItemId,
        page: 1,
        limit: 100,
      });
      setPreviousQuantity(computePreviousQuantity(result.items));
    } catch {
      // Keep last known previous quantity when refresh fails offline mid-session
    }
  }, [boqItemId, contractorId, isOnline, selectedProject?.id]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void refreshPreviousQuantity();
  }, [refreshPreviousQuantity]);

  const onPickPhotos = useCallback(() => {
    Alert.alert('Evidence photo', undefined, [
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
  }, []);

  const onQueueSubmit = useCallback(async () => {
    if (!selectedProject?.id) {
      Alert.alert('Project', 'Select a project first');
      return;
    }

    const qty = Number(currentQuantityText);
    const formCheck = validateMeasurementForm({
      projectId: selectedProject.id,
      contractorId,
      boqItemId,
      location,
      measurementDate,
      currentQuantity: qty,
      previousQuantity,
      boqPlannedQuantity,
      drawingReference: drawingReference || null,
      photoCount: photos.length,
    });
    if (!formCheck.ok) {
      Alert.alert('Validation', formCheck.message);
      return;
    }

    setSaving(true);
    try {
      const entry = buildMeasurementOfflineEnqueue({
        projectId: selectedProject.id,
        contractorId,
        boqItemId,
        boqCode: selectedBoq?.boqCode,
        location,
        measurementDate,
        currentQuantity: qty,
        previousQuantity,
        boqPlannedQuantity,
        unit: selectedBoq?.unit,
        drawingReference: drawingReference || null,
        notes: notes || null,
        photos,
        submit: true,
      });
      await enqueue(entry);
      Alert.alert(
        'Queued',
        isOnline
          ? 'Measurement queued — sync will upload photos then submit for engineer verification.'
          : 'Measurement saved offline. It will sync when you are back online.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        'Could not queue measurement',
        getErrorMessage(error, 'Unknown error'),
      );
    } finally {
      setSaving(false);
    }
  }, [
    boqItemId,
    boqPlannedQuantity,
    contractorId,
    currentQuantityText,
    drawingReference,
    enqueue,
    isOnline,
    location,
    measurementDate,
    navigation,
    notes,
    photos,
    previousQuantity,
    selectedBoq?.boqCode,
    selectedBoq?.unit,
    selectedProject?.id,
  ]);

  if (!caps.canCreate) {
    return (
      <Screen title="New measurement" subtitle="Site capture">
        <AsyncStatePanel
          forbidden
          error="Missing permission measurement.create"
        />
      </Screen>
    );
  }

  if (!selectedProject) {
    return (
      <Screen title="New measurement" subtitle="Site capture">
        <AsyncStatePanel
          empty
          emptyLabel="Choose a project before capturing quantities."
        />
        <Button
          label="Select project"
          onPress={() => navigation.navigate('ProjectSelect')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="New measurement"
      subtitle={`${selectedProject.projectCode} · evidence required`}
    >
      {loadingLookups ? (
        <AsyncStatePanel loading loadingLabel="Loading contractors and BOQ…" />
      ) : null}
      {lookupError ? (
        <AsyncStatePanel
          error={lookupError}
          onRetry={() => void loadLookups()}
        />
      ) : null}
      {lookupHint ? <Text style={styles.hint}>{lookupHint}</Text> : null}

      <FormSection title="Scope">
        <Text style={styles.label}>Contractor</Text>
        {contractors.length > 0 ? (
          <View style={styles.chipRow}>
            {contractors.map((row) => (
              <Chip
                key={row.id}
                label={row.contractorCode}
                selected={contractorId === row.id}
                onPress={() => setContractorId(row.id)}
              />
            ))}
          </View>
        ) : null}
        <TextField
          value={contractorId}
          onChangeText={setContractorId}
          autoCapitalize="none"
          placeholder="Contractor ObjectId"
        />

        <Text style={styles.label}>BOQ item</Text>
        {boqItems.length > 0 ? (
          <View style={styles.chipRow}>
            {boqItems.slice(0, 12).map((row) => (
              <Chip
                key={row.id}
                label={row.boqCode}
                selected={boqItemId === row.id}
                onPress={() => setBoqItemId(row.id)}
              />
            ))}
          </View>
        ) : null}
        <TextField
          value={boqItemId}
          onChangeText={setBoqItemId}
          autoCapitalize="none"
          placeholder="BOQ item ObjectId"
        />
        {selectedBoq ? (
          <Text style={styles.meta}>
            {selectedBoq.description} · planned {selectedBoq.plannedQuantity}{' '}
            {selectedBoq.unit}
          </Text>
        ) : null}

        <TextField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Block A / Floor 2 / Grid C-D"
        />
        <TextField
          label="Measurement date (YYYY-MM-DD)"
          value={measurementDate}
          onChangeText={setMeasurementDate}
          autoCapitalize="none"
          containerStyle={styles.fieldFlush}
        />
      </FormSection>

      <FormSection title="Quantities">
        <View style={styles.qtyRow}>
          <View style={styles.qtyBox}>
            <Text style={styles.label}>Previous</Text>
            <Text style={styles.qtyValue}>{roundQty(previousQuantity)}</Text>
          </View>
          <View style={styles.qtyBox}>
            <TextField
              label="Current"
              value={currentQuantityText}
              onChangeText={setCurrentQuantityText}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.fieldFlush}
            />
          </View>
          <View style={styles.qtyBox}>
            <Text style={styles.label}>Cumulative</Text>
            <Text style={styles.qtyValue}>
              {cumulativeCheck.cumulativeQuantity}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          BOQ allowed {boqPlannedQuantity}
          {selectedBoq?.unit ? ` ${selectedBoq.unit}` : ''}
        </Text>
        {!cumulativeCheck.ok ? (
          <Text style={styles.danger}>{cumulativeCheck.message}</Text>
        ) : null}
      </FormSection>

      <FormSection title="Evidence" framed={false}>
        <TextField
          label="Drawing reference"
          value={drawingReference}
          onChangeText={setDrawingReference}
          placeholder="Optional drawing / sheet ref"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional site notes"
          style={styles.notes}
        />
        <Button
          label={`Photos (${photos.length})`}
          variant="secondary"
          onPress={onPickPhotos}
        />
      </FormSection>

      <Button
        label={saving ? 'Queuing…' : 'Save offline & submit'}
        loading={saving}
        onPress={() => void onQueueSubmit()}
        style={styles.submit}
      />

      <Text style={styles.meta}>
        Captured at site, queued offline, verified later by an engineer
        (measurement.certify).
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  meta: { ...typography.meta, marginTop: spacing.xs },
  hint: {
    ...typography.meta,
    color: colors.warning,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  danger: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fieldFlush: { marginBottom: 0 },
  qtyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qtyBox: { flex: 1 },
  qtyValue: {
    ...typography.bodyStrong,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    minHeight: 44,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  submit: { marginTop: spacing.md, marginBottom: spacing.md },
});
