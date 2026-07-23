import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import {
  buildStockCountOfflineEnqueue,
  canCreateSubmitStockCounts,
  canViewStockCounts,
  clearStockCountDraft,
  fetchStockCount,
  fetchStockForecastForCount,
  loadStockCountDraft,
  MaterialCountRow,
  saveStockCountDraft,
  type CountLine,
  validateCountLines,
} from '@/stock-count';
import type { DraftStorage } from '@/stock-count/draftStore';
import { colors, spacing, typography } from '@/theme';
import { pickImageFromCamera } from '@/utils/fileUpload';

type Props = NativeStackScreenProps<AppStackParamList, 'StockCountEntry'>;

const asyncDraftStorage: DraftStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

let lineSeq = 0;
function nextKey(): string {
  lineSeq += 1;
  return `line-${lineSeq}`;
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StockCountEntryScreen({ navigation, route }: Props) {
  const countId = route.params?.countId;
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();

  const canView = canViewStockCounts(hasPermission);
  const canSubmit = canCreateSubmitStockCounts(hasPermission);

  const [countDate, setCountDate] = useState(todayDateOnly);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<CountLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<
    Record<string, { physicalQuantity?: string; reason?: string }>
  >({});
  const [readOnlyStatus, setReadOnlyStatus] = useState<string | null>(null);
  const hydrated = useRef(false);

  const projectId = selectedProject?.id;

  const bootstrap = useCallback(async () => {
    if (!canView && !canSubmit) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (!projectId) {
      setError('Select a project first');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      if (countId) {
        if (!isOnline) {
          setError('Connect online to open an existing stock count.');
          setLoading(false);
          return;
        }
        const count = await fetchStockCount(countId);
        setCountDate(count.countDate.slice(0, 10) || todayDateOnly());
        setLocation(count.location ?? '');
        setNotes(count.notes ?? '');
        setReadOnlyStatus(count.status === 'draft' ? null : count.status);
        setLines(
          count.items.map((item) => ({
            key: item.id || nextKey(),
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            baseUnit: item.baseUnit,
            systemQuantity: item.systemQuantity,
            physicalQuantity: item.physicalQuantity,
            reason: item.reason ?? '',
            photoUri: null,
            photoName: null,
            photoMimeType: null,
            photoSize: null,
          })),
        );
        hydrated.current = true;
        setLoading(false);
        return;
      }

      const draft = await loadStockCountDraft(projectId, asyncDraftStorage);
      if (draft && draft.lines.length > 0) {
        setCountDate(draft.countDate || todayDateOnly());
        setLocation(draft.location);
        setNotes(draft.notes);
        setLines(draft.lines);
        hydrated.current = true;
        setLoading(false);
        return;
      }

      if (!isOnline) {
        setError(
          'No offline draft found. Load materials while online first, then continue offline.',
        );
        setLoading(false);
        return;
      }

      const forecast = await fetchStockForecastForCount({ projectId });
      if (forecast.length === 0) {
        setError(
          'No project materials with stock history. Receive or issue stock first.',
        );
        setLines([]);
      } else {
        setLines(
          forecast.map((row) => ({
            key: nextKey(),
            materialId: row.materialId,
            materialCode: row.materialCode,
            materialName: row.materialName,
            baseUnit: row.baseUnit,
            systemQuantity: row.availableStock,
            physicalQuantity: row.availableStock,
            reason: '',
            photoUri: null,
            photoName: null,
            photoMimeType: null,
            photoSize: null,
          })),
        );
      }
      hydrated.current = true;
    } catch (err) {
      if (isForbiddenError(err)) {
        setForbidden(true);
      } else {
        setError(getErrorMessage(err, 'Could not prepare stock count'));
      }
    } finally {
      setLoading(false);
    }
  }, [canSubmit, canView, countId, isOnline, projectId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!hydrated.current || !projectId || countId || readOnlyStatus) return;
    const handle = setTimeout(() => {
      void saveStockCountDraft(
        {
          projectId,
          countDate,
          location,
          notes,
          lines,
          updatedAt: new Date().toISOString(),
        },
        asyncDraftStorage,
      );
    }, 400);
    return () => clearTimeout(handle);
  }, [countDate, countId, lines, location, notes, projectId, readOnlyStatus]);

  const updateLine = useCallback((key: string, patch: Partial<CountLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }, []);

  const capturePhoto = useCallback(
    async (key: string) => {
      try {
        const file = await pickImageFromCamera();
        if (!file) return;
        updateLine(key, {
          photoUri: file.uri,
          photoName: file.name,
          photoMimeType: file.mimeType,
          photoSize: file.size ?? null,
        });
      } catch (err) {
        Alert.alert('Camera', getErrorMessage(err, 'Could not capture photo'));
      }
    },
    [updateLine],
  );

  const submitOffline = useCallback(async () => {
    if (!projectId) {
      Alert.alert('Project', 'Select a project first');
      return;
    }
    if (!canSubmit) {
      setForbidden(true);
      return;
    }
    if (readOnlyStatus) {
      Alert.alert(
        'Stock count',
        `Count is ${readOnlyStatus} and cannot be edited`,
      );
      return;
    }

    const check = validateCountLines(lines);
    if (!check.ok) {
      setFormError(check.formError ?? null);
      setLineErrors(check.lineErrors);
      Alert.alert(
        'Validation',
        check.formError ??
          'Fix variance reasons and quantities before submitting',
      );
      return;
    }
    setFormError(null);
    setLineErrors({});

    setSaving(true);
    try {
      const enqueueInput = buildStockCountOfflineEnqueue({
        projectId,
        countDate,
        location: location.trim() || null,
        notes: notes.trim() || null,
        lines,
        labelHint: selectedProject?.projectCode,
      });
      await enqueue(enqueueInput);
      await clearStockCountDraft(projectId, asyncDraftStorage);
      Alert.alert(
        'Queued',
        isOnline
          ? 'Stock count queued — sync will upload photos, create, then submit.'
          : 'Stock count saved offline. It will sync when you are back online.',
        [{ text: 'OK', onPress: () => navigation.navigate('StockCountList') }],
      );
    } catch (err) {
      Alert.alert(
        'Stock count',
        getErrorMessage(err, 'Could not queue stock count'),
      );
    } finally {
      setSaving(false);
    }
  }, [
    canSubmit,
    countDate,
    enqueue,
    isOnline,
    lines,
    location,
    navigation,
    notes,
    projectId,
    readOnlyStatus,
    selectedProject?.projectCode,
  ]);

  const header = useMemo(
    () => (
      <FormSection title="Count details" framed={false}>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <TextField
          label="Count date"
          value={countDate}
          onChangeText={setCountDate}
          editable={!readOnlyStatus}
          placeholder="YYYY-MM-DD"
        />
        <TextField
          label="Location"
          value={location}
          onChangeText={setLocation}
          editable={!readOnlyStatus}
          placeholder="Main Store (optional)"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          editable={!readOnlyStatus}
          placeholder="Optional notes"
        />
        <Text style={styles.listMeta}>
          {lines.length} materials · system qty from forecast (Nest refreshes on
          submit)
        </Text>
      </FormSection>
    ),
    [countDate, formError, lines.length, location, notes, readOnlyStatus],
  );

  if (forbidden) {
    return (
      <Screen title="Count entry" subtitle="Physical count">
        <AsyncStatePanel
          forbidden
          error="Create/submit needs Nest stock.adjust. List/view needs stock.view."
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="Count entry" subtitle="Physical count" scroll={false}>
        <AsyncStatePanel loading loadingLabel="Preparing count…" />
      </Screen>
    );
  }

  if (error && lines.length === 0) {
    return (
      <Screen title="Count entry" subtitle="Physical count">
        <AsyncStatePanel
          error={error}
          onRetry={() => void bootstrap()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Count entry"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · capture & submit offline`
          : 'Select a project'
      }
      scroll={false}
    >
      <FlatList
        data={lines}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={9}
        removeClippedSubviews
        renderItem={({ item }) => (
          <MaterialCountRow
            line={item}
            errors={lineErrors[item.key]}
            onChangePhysical={(value) => {
              const n = Number(value);
              updateLine(item.key, {
                physicalQuantity: value.trim() === '' ? Number.NaN : n,
              });
            }}
            onChangeReason={(value) => updateLine(item.key, { reason: value })}
            onCapturePhoto={() => void capturePhoto(item.key)}
            onClearPhoto={() =>
              updateLine(item.key, {
                photoUri: null,
                photoName: null,
                photoMimeType: null,
                photoSize: null,
              })
            }
          />
        )}
        ListFooterComponent={
          !readOnlyStatus && canSubmit ? (
            <Button
              label={
                isOnline
                  ? 'Queue count for sync (create + submit)'
                  : 'Save count offline (create + submit)'
              }
              loading={saving}
              onPress={() => void submitOffline()}
              style={styles.submit}
            />
          ) : (
            <Text style={styles.readOnly}>
              {readOnlyStatus
                ? `Status: ${readOnlyStatus}`
                : 'Missing stock.adjust permission'}
            </Text>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxxl },
  listMeta: {
    ...typography.meta,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  formError: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  readOnly: {
    ...typography.meta,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
});
