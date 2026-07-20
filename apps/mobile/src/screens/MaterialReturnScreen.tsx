import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { Screen } from '@/components/Screen';
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
import { colors } from '@/theme/colors';
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
        <Text style={styles.error}>
          Permission denied — Nest catalog code stock.issue is required (alias
          material_issue.return is not in the catalog).
        </Text>
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
        <Text style={styles.error}>
          Permission denied while loading issues (stock.view).
        </Text>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => void loadSources()}>
            <Text style={styles.secondaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Source issue</Text>
      {loading && !issue ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}
      {!issue && !loading ? (
        sourceIssues.length === 0 ? (
          <Text style={styles.empty}>
            No confirmed issues available. Confirm an issue before returning.
          </Text>
        ) : (
          sourceIssues.map((row) => (
            <Pressable
              key={row.id}
              style={styles.issueOption}
              onPress={() => void selectIssue(row.id)}
            >
              <Text style={styles.issueTitle}>{row.issueNumber}</Text>
              <Text style={styles.meta}>{row.workLocation}</Text>
            </Pressable>
          ))
        )
      ) : null}

      {issue ? (
        <View style={styles.selectedIssue}>
          <Text style={styles.issueTitle}>{issue.issueNumber}</Text>
          <Text style={styles.meta}>
            {issue.workLocation} · {returnableCount} returnable line(s)
          </Text>
          <Pressable
            onPress={() => {
              setIssue(null);
              setLines([]);
            }}
          >
            <Text style={styles.link}>Change source issue</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Return date</Text>
      <TextInput
        style={styles.input}
        value={returnDate}
        onChangeText={setReturnDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Recipient (returned by)</Text>
      {canViewUsers && recipients.length > 0 ? (
        <View style={styles.recipientList}>
          {recipients.slice(0, 12).map((person) => {
            const selected = returnedBy === person.id;
            return (
              <Pressable
                key={person.id}
                style={[
                  styles.recipientChip,
                  selected && styles.recipientChipSelected,
                ]}
                onPress={() => setReturnedBy(person.id)}
              >
                <Text
                  style={[
                    styles.recipientChipText,
                    selected && styles.recipientChipTextSelected,
                  ]}
                >
                  {person.fullName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={returnedBy}
          onChangeText={setReturnedBy}
          placeholder="User id (defaults to you)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      )}

      {lines.map((line) => (
        <View key={line.materialId} style={styles.lineCard}>
          <Text style={styles.lineTitle}>{line.materialLabel}</Text>
          <Text style={styles.meta}>
            Outstanding {line.remainingBaseQuantity} {line.unit}
          </Text>
          <Text style={styles.label}>Return qty</Text>
          <TextInput
            style={styles.input}
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
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={styles.input}
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
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ))}

      {issue && lines.length === 0 ? (
        <Text style={styles.empty}>
          This issue has no outstanding quantity left to return.
        </Text>
      ) : null}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Optional notes"
        placeholderTextColor={colors.textMuted}
      />

      <Pressable style={styles.secondaryBtn} onPress={() => void capturePhoto()}>
        <Text style={styles.secondaryBtnText}>
          Add photo ({photos.length})
        </Text>
      </Pressable>

      <Pressable
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        disabled={saving || !issue}
        onPress={() => void submit()}
      >
        {saving ? (
          <ActivityIndicator color="#F4F0E6" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {isOnline ? 'Queue return for sync' : 'Save return offline'}
          </Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  empty: { color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  error: { color: colors.danger, lineHeight: 20 },
  errorBox: { marginBottom: 12, gap: 8 },
  link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
  issueOption: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 8,
  },
  selectedIssue: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: 12,
    marginTop: 4,
  },
  issueTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  lineCard: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lineTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  recipientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recipientChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  recipientChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  recipientChipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  recipientChipTextSelected: { color: '#F4F0E6' },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '600' },
  primaryBtn: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#F4F0E6', fontWeight: '700', fontSize: 15 },
});
