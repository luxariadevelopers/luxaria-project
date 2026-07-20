import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors } from '@/theme/colors';
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
import {
  EmptyPanel,
  ForbiddenPanel,
  LoadingPanel,
} from '@/work-measurement/components/StatePanels';
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
      setLookupError(
        'Load contractors and BOQ items while online, then capture offline.',
      );
      return;
    }

    setLoadingLookups(true);
    setLookupError(null);
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
        setLookupError(
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
        <ForbiddenPanel message="Missing permission measurement.create" />
      </Screen>
    );
  }

  if (!selectedProject) {
    return (
      <Screen title="New measurement" subtitle="Site capture">
        <EmptyPanel
          title="No project selected"
          description="Choose a project before capturing quantities."
          actionLabel="Select project"
          onAction={() => navigation.navigate('ProjectSelect')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="New measurement"
      subtitle={`${selectedProject.projectCode} · evidence required`}
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loadingLookups ? (
          <LoadingPanel label="Loading contractors and BOQ…" />
        ) : null}
        {lookupError ? <Text style={styles.warning}>{lookupError}</Text> : null}

        <Text style={styles.label}>Contractor</Text>
        {contractors.length > 0 ? (
          <View style={styles.chipWrap}>
            {contractors.map((row) => (
              <Pressable
                key={row.id}
                style={[
                  styles.chip,
                  contractorId === row.id && styles.chipActive,
                ]}
                onPress={() => setContractorId(row.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    contractorId === row.id && styles.chipTextActive,
                  ]}
                >
                  {row.contractorCode}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={contractorId}
          onChangeText={setContractorId}
          autoCapitalize="none"
          placeholder="Contractor ObjectId"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>BOQ item</Text>
        {boqItems.length > 0 ? (
          <View style={styles.chipWrap}>
            {boqItems.slice(0, 12).map((row) => (
              <Pressable
                key={row.id}
                style={[styles.chip, boqItemId === row.id && styles.chipActive]}
                onPress={() => setBoqItemId(row.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    boqItemId === row.id && styles.chipTextActive,
                  ]}
                >
                  {row.boqCode}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={boqItemId}
          onChangeText={setBoqItemId}
          autoCapitalize="none"
          placeholder="BOQ item ObjectId"
          placeholderTextColor={colors.textMuted}
        />
        {selectedBoq ? (
          <Text style={styles.meta}>
            {selectedBoq.description} · planned {selectedBoq.plannedQuantity}{' '}
            {selectedBoq.unit}
          </Text>
        ) : null}

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Block A / Floor 2 / Grid C-D"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Measurement date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={measurementDate}
          onChangeText={setMeasurementDate}
          autoCapitalize="none"
        />

        <View style={styles.qtyRow}>
          <View style={styles.qtyBox}>
            <Text style={styles.label}>Previous</Text>
            <Text style={styles.qtyValue}>{roundQty(previousQuantity)}</Text>
          </View>
          <View style={styles.qtyBox}>
            <Text style={styles.label}>Current</Text>
            <TextInput
              style={styles.input}
              value={currentQuantityText}
              onChangeText={setCurrentQuantityText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
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

        <Text style={styles.label}>Drawing reference</Text>
        <TextInput
          style={styles.input}
          value={drawingReference}
          onChangeText={setDrawingReference}
          placeholder="Optional drawing / sheet ref"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional site notes"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable style={styles.secondaryButton} onPress={onPickPhotos}>
          <Text style={styles.secondaryButtonText}>
            Photos ({photos.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, saving && styles.disabled]}
          disabled={saving}
          onPress={() => void onQueueSubmit()}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Queuing…' : 'Save offline & submit'}
          </Text>
        </Pressable>

        <Text style={styles.meta}>
          Captured at site, queued offline, verified later by an engineer
          (measurement.certify).
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
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
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  warning: {
    color: colors.warning,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  danger: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
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
  qtyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  qtyBox: { flex: 1 },
  qtyValue: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#F4F0E6', fontWeight: '700' },
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
