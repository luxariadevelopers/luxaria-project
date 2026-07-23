import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import {
  getMaterialIssue,
  listMaterialIssues,
  listUsersForReturn,
} from '@/features/material-issue/api';
import { buildMaterialReturnOfflineEnqueue } from '@/features/material-issue/buildMaterialReturnOfflineEnqueue';
import {
  MaterialIssueStatus,
  type MaterialIssueUserOption,
  type MaterialUnit,
  type PublicMaterialIssue,
} from '@/features/material-issue/types';
import {
  validateReturnLines,
  type ReturnLineDraft,
} from '@/features/material-issue/validation';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { spacing, typography } from '@/theme';
import { pickImageFromCamera, type LocalFile } from '@/utils/fileUpload';

type Props = NativeStackScreenProps<AppStackParamList, 'MaterialReturn'>;

export function MaterialReturnScreen({ navigation, route }: Props) {
  const { user, hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();

  const canReturn = hasPermission('stock.issue');
  const canView = hasPermission('stock.view');
  const canViewUsers = hasPermission('user.view');

  const [sourceIssues, setSourceIssues] = useState<PublicMaterialIssue[]>([]);
  const [issue, setIssue] = useState<PublicMaterialIssue | null>(null);
  const [lines, setLines] = useState<ReturnLineDraft[]>([]);
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [returnedBy, setReturnedBy] = useState(user?.id ?? '');
  const [recipients, setRecipients] = useState<MaterialIssueUserOption[]>([]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const returnableCount = useMemo(
    () => lines.filter((line) => line.remainingBaseQuantity > 1e-9).length,
    [lines],
  );

  const applyIssue = useCallback((row: PublicMaterialIssue) => {
    setIssue(row);
    setLines(
      row.items
        .filter((item) => item.remainingBaseQuantity > 1e-9)
        .map((item) => ({
          materialId: item.materialId,
          materialLabel:
            item.materialCode ?? item.materialName ?? item.materialId,
          unit: item.baseUnit,
          remainingBaseQuantity: item.remainingBaseQuantity,
          quantityText: '',
          reason: '',
        })),
    );
  }, []);

  const loadSources = useCallback(async () => {
    if (!canView) {
      setForbidden(true);
      return;
    }
    if (!selectedProject?.id) {
      setError('Select a project first');
      return;
    }
    if (!isOnline) {
      setError('Load the source issue while online, then you can queue offline.');
      return;
    }

    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const rows = await listMaterialIssues({
        projectId: selectedProject.id,
        status: MaterialIssueStatus.Confirmed,
        limit: 50,
      });
      setSourceIssues(rows);

      const preferredId = route.params?.issueId;
      if (preferredId) {
        const detail = await getMaterialIssue(preferredId);
        if (detail.status !== MaterialIssueStatus.Confirmed) {
          setError('Returns are only allowed on confirmed issues');
        } else {
          applyIssue(detail);
        }
      }

      if (canViewUsers) {
        const users = await listUsersForReturn({
          projectId: selectedProject.id,
        });
        setRecipients(users);
      }
    } catch (err) {
      if (isForbiddenError(err)) {
        setForbidden(true);
        setError(null);
      } else {
        setError(getErrorMessage(err, 'Could not load source issues'));
      }
    } finally {
      setLoading(false);
    }
  }, [
    applyIssue,
    canView,
    canViewUsers,
    isOnline,
    route.params?.issueId,
    selectedProject?.id,
  ]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (user?.id && !returnedBy) {
      setReturnedBy(user.id);
    }
  }, [returnedBy, user?.id]);

  const selectIssue = useCallback(
    async (id: string) => {
      if (!isOnline) {
        Alert.alert(
          'Offline',
          'Load the source issue while online first, then capture the return offline.',
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await getMaterialIssue(id);
        if (detail.status !== MaterialIssueStatus.Confirmed) {
          setError('Returns are only allowed on confirmed issues');
          setIssue(null);
          setLines([]);
          return;
        }
        applyIssue(detail);
      } catch (err) {
        if (isForbiddenError(err)) {
          setForbidden(true);
        } else {
          setError(getErrorMessage(err, 'Could not load issue'));
        }
      } finally {
        setLoading(false);
      }
    },
    [applyIssue, isOnline],
  );

  const capturePhoto = useCallback(async () => {
    try {
      const file = await pickImageFromCamera();
      if (file) setPhotos((prev) => [...prev, file]);
    } catch (err) {
      Alert.alert('Camera', getErrorMessage(err, 'Could not capture photo'));
    }
  }, []);

  const submit = useCallback(async () => {
    if (!canReturn) {
      Alert.alert('Permission denied', 'stock.issue is required to post returns');
      return;
    }
    const projectId = selectedProject?.id;
    if (!projectId) {
      Alert.alert('Project', 'Select a project first');
      return;
    }
    if (!issue) {
      Alert.alert('Source issue', 'Select a confirmed material issue');
      return;
    }
    if (!photos.length) {
      Alert.alert('Photos', 'Capture at least one return photo');
      return;
    }
    if (!returnedBy.trim()) {
      Alert.alert('Recipient', 'Select who is returning the material');
      return;
    }

    const validated = validateReturnLines(lines);
    if (!validated.ok) {
      Alert.alert('Quantity', validated.message);
      return;
    }

    setSaving(true);
    try {
      const entry = buildMaterialReturnOfflineEnqueue({
        projectId,
        issueId: issue.id,
        issueNumber: issue.issueNumber,
        returnDate,
        returnedBy: returnedBy.trim(),
        notes: notes.trim() || null,
        photos,
        items: validated.items.map((item) => {
          const line = lines.find((row) => row.materialId === item.materialId);
          return {
            materialId: item.materialId,
            materialLabel: line?.materialLabel,
            quantity: item.quantity,
            unit: item.unit as MaterialUnit,
            reason: item.reason,
            remainingBaseQuantity: line?.remainingBaseQuantity ?? 0,
          };
        }),
      });
      await enqueue(entry);
      Alert.alert(
        'Queued',
        isOnline
          ? 'Material return queued — photos upload first, then stock is posted.'
          : 'Material return saved offline. It will sync when you are back online.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(
        'Return',
        getErrorMessage(err, 'Could not queue material return'),
      );
    } finally {
      setSaving(false);
    }
  }, [
    canReturn,
    enqueue,
    isOnline,
    issue,
    lines,
    navigation,
    notes,
    photos,
    returnDate,
    returnedBy,
    selectedProject?.id,
  ]);

  if (!canReturn) {
    return (
      <Screen title="Material return" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="Permission denied — Nest catalog code stock.issue is required (alias material_issue.return is not in the catalog)."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Material return"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · unused material back to stock`
          : 'Select a project first'
      }
    >
      {forbidden ? (
        <AsyncStatePanel
          forbidden
          error="Permission denied while loading issues (stock.view)."
          onRetry={() => void loadSources()}
        />
      ) : null}
      {error ? (
        <AsyncStatePanel error={error} onRetry={() => void loadSources()} />
      ) : null}

      <FormSection title="Source issue" framed={false}>
        {loading && !issue ? (
          <AsyncStatePanel loading loadingLabel="Loading issues…" />
        ) : null}
        {!issue && !loading ? (
          sourceIssues.length === 0 ? (
            <Text style={styles.empty}>
              No confirmed issues available. Confirm an issue before returning.
            </Text>
          ) : (
            sourceIssues.map((row) => (
              <ListRow
                key={row.id}
                title={row.issueNumber}
                meta={row.workLocation}
                onPress={() => void selectIssue(row.id)}
              />
            ))
          )
        ) : null}

        {issue ? (
          <ListRow
            title={issue.issueNumber}
            meta={`${issue.workLocation} · ${returnableCount} returnable line(s)`}
            rightSlot={
              <Button
                label="Change"
                variant="ghost"
                onPress={() => {
                  setIssue(null);
                  setLines([]);
                }}
              />
            }
          />
        ) : null}
      </FormSection>

      <FormSection title="Return details">
        <TextField
          label="Return date"
          value={returnDate}
          onChangeText={setReturnDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          containerStyle={styles.fieldFlush}
        />

        <Text style={styles.label}>Recipient (returned by)</Text>
        {canViewUsers && recipients.length > 0 ? (
          <View style={styles.chipRow}>
            {recipients.slice(0, 12).map((person) => (
              <Chip
                key={person.id}
                label={person.fullName}
                selected={returnedBy === person.id}
                onPress={() => setReturnedBy(person.id)}
              />
            ))}
          </View>
        ) : (
          <TextField
            value={returnedBy}
            onChangeText={setReturnedBy}
            placeholder="User id (defaults to you)"
            autoCapitalize="none"
            containerStyle={styles.fieldFlush}
          />
        )}
      </FormSection>

      {lines.map((line) => (
        <FormSection
          key={line.materialId}
          title={line.materialLabel}
          description={`Outstanding ${line.remainingBaseQuantity} ${line.unit}`}
        >
          <TextField
            label="Return qty"
            keyboardType="decimal-pad"
            value={line.quantityText}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row) =>
                  row.materialId === line.materialId
                    ? { ...row, quantityText: value }
                    : row,
                ),
              )
            }
            placeholder="0"
          />
          <TextField
            label="Reason"
            value={line.reason}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row) =>
                  row.materialId === line.materialId
                    ? { ...row, reason: value }
                    : row,
                ),
              )
            }
            placeholder="Unused / over-issued"
            containerStyle={styles.fieldFlush}
          />
        </FormSection>
      ))}

      {issue && lines.length === 0 ? (
        <Text style={styles.empty}>
          This issue has no outstanding quantity left to return.
        </Text>
      ) : null}

      <FormSection title="Notes & evidence" framed={false}>
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes"
          style={styles.notes}
        />
        <Button
          label={`Add photo (${photos.length})`}
          variant="secondary"
          onPress={() => void capturePhoto()}
        />
      </FormSection>

      <Button
        label={isOnline ? 'Queue return for sync' : 'Save return offline'}
        loading={saving}
        disabled={!issue}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  fieldFlush: { marginBottom: 0 },
  empty: { ...typography.meta, lineHeight: 20, marginBottom: spacing.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  submit: { marginTop: spacing.md, marginBottom: spacing.xxxl },
});
