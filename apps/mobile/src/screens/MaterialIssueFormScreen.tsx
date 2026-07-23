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
  attachMaterialIssueSignatures,
  createMaterialIssue,
  listBoqItemsForIssue,
  listContractorsForIssue,
  listMaterialsForIssue,
  listUsersForReturn,
  submitMaterialIssue,
} from '@/features/material-issue/api';
import { buildMaterialIssueOfflineEnqueue } from '@/features/material-issue/buildMaterialIssueOfflineEnqueue';
import {
  MaterialUnit,
  type MaterialIssueBoqItemOption,
  type MaterialIssueContractorOption,
  type MaterialIssueMaterialOption,
  type MaterialIssueUserOption,
  type PublicMaterialIssue,
} from '@/features/material-issue/types';
import {
  computeLocalFileSha256,
  uploadMaterialIssueSignature,
} from '@/features/material-issue/uploadMaterialIssueSignature';
import {
  validateIssueForm,
  type IssueLineDraft,
} from '@/features/material-issue/validation';
import { SignatureCaptureField } from '@/labour-vouchers/components/SignatureCaptureField';
import type { AppStackParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors } from '@/theme/colors';
import type { LocalFile } from '@/utils/fileUpload';

type Props = NativeStackScreenProps<AppStackParamList, 'MaterialIssueForm'>;

function emptyLine(): IssueLineDraft {
  return {
    materialId: '',
    materialLabel: '',
    unit: MaterialUnit.Bag,
    quantityText: '',
    batch: '',
    notes: '',
  };
}

export function MaterialIssueFormScreen({ navigation }: Props) {
  const { user, hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();

  const canCreate = hasPermission('stock.issue');
  const canUpload = hasPermission('document.upload');
  const canViewMaterials = hasPermission('material.view');
  const canViewBoq = hasPermission('boq.view');
  const canViewContractors = hasPermission('contractor.view');
  const canViewUsers = hasPermission('user.view');

  const [materials, setMaterials] = useState<MaterialIssueMaterialOption[]>([]);
  const [boqItems, setBoqItems] = useState<MaterialIssueBoqItemOption[]>([]);
  const [contractors, setContractors] = useState<
    MaterialIssueContractorOption[]
  >([]);
  const [recipients, setRecipients] = useState<MaterialIssueUserOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [receivedBy, setReceivedBy] = useState(user?.id ?? '');
  const [boqItemId, setBoqItemId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<IssueLineDraft[]>([emptyLine()]);
  const [recipientSig, setRecipientSig] = useState<LocalFile | null>(null);
  const [issuerSig, setIssuerSig] = useState<LocalFile | null>(null);
  const [draft, setDraft] = useState<PublicMaterialIssue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBoq = useMemo(
    () => boqItems.find((row) => row.id === boqItemId) ?? null,
    [boqItemId, boqItems],
  );

  const loadLookups = useCallback(async () => {
    if (!canCreate || !selectedProject?.id) {
      return;
    }
    if (!isOnline) {
      setLookupError(
        'Load materials and BOQ items while online, then capture offline.',
      );
      return;
    }

    setLoadingLookups(true);
    setLookupError(null);
    try {
      const [materialRows, boqRows, contractorRows, userRows] =
        await Promise.all([
          canViewMaterials
            ? listMaterialsForIssue()
            : Promise.resolve([] as MaterialIssueMaterialOption[]),
          canViewBoq
            ? listBoqItemsForIssue({ projectId: selectedProject.id, limit: 50 })
            : Promise.resolve([] as MaterialIssueBoqItemOption[]),
          canViewContractors
            ? listContractorsForIssue({ limit: 50 })
            : Promise.resolve([] as MaterialIssueContractorOption[]),
          canViewUsers
            ? listUsersForReturn({ projectId: selectedProject.id })
            : Promise.resolve([] as MaterialIssueUserOption[]),
        ]);
      setMaterials(materialRows);
      setBoqItems(boqRows);
      setContractors(contractorRows);
      setRecipients(userRows);

      if (!canViewMaterials || !canViewBoq) {
        setLookupError(
          'Enter material and BOQ ids manually if lookups are unavailable (material.view / boq.view).',
        );
      }
    } catch (err) {
      if (isForbiddenError(err)) {
        setLookupError(
          getErrorMessage(err, 'Missing permission to load form lookups'),
        );
      } else {
        setLookupError(getErrorMessage(err, 'Could not load form lookups'));
      }
    } finally {
      setLoadingLookups(false);
    }
  }, [
    canCreate,
    canViewBoq,
    canViewContractors,
    canViewMaterials,
    canViewUsers,
    isOnline,
    selectedProject?.id,
  ]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (user?.id && !receivedBy) {
      setReceivedBy(user.id);
    }
  }, [receivedBy, user?.id]);

  const applyMaterial = useCallback(
    (lineIndex: number, material: MaterialIssueMaterialOption) => {
      setLines((prev) =>
        prev.map((row, index) =>
          index === lineIndex
            ? {
                ...row,
                materialId: material.id,
                materialLabel:
                  material.materialCode || material.materialName || material.id,
                unit: material.baseUnit || row.unit,
              }
            : row,
        ),
      );
    },
    [],
  );

  const submit = useCallback(async () => {
    if (!canCreate) {
      Alert.alert('Permission denied', 'stock.issue is required to create issues');
      return;
    }
    if (!canUpload) {
      Alert.alert(
        'Permission denied',
        'document.upload is required to attach signatures',
      );
      return;
    }
    const projectId = selectedProject?.id;
    if (!projectId) {
      Alert.alert('Project', 'Select a project first');
      return;
    }
    if (!recipientSig) {
      Alert.alert('Signatures', 'Recipient signature is required before submit');
      return;
    }
    const validated = validateIssueForm({
      projectId,
      issueDate,
      receivedBy,
      boqItemId,
      workLocation,
      contractorId,
      blockId,
      floorId,
      storeLocation,
      notes,
      lines,
    });
    if (!validated.ok) {
      Alert.alert('Validation', validated.message);
      return;
    }

    setSaving(true);
    setError(null);
    const issueItems = validated.payload.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit as MaterialUnit,
      batch: item.batch,
      notes: item.notes,
    }));
    try {
      if (isOnline) {
        let issue = draft;
        if (!issue) {
          issue = await createMaterialIssue({
            ...validated.payload,
            items: issueItems,
          });
          setDraft(issue);
        }

        const recipientUpload = await uploadMaterialIssueSignature({
          projectId,
          issueId: issue.id,
          file: recipientSig,
          documentType: 'signature',
        });

        const attachInput: {
          recipientSignatureDocumentId: string;
          recipientSignatureChecksum: string;
          issuerSignatureDocumentId?: string;
          issuerSignatureChecksum?: string;
        } = {
          recipientSignatureDocumentId: recipientUpload.documentId,
          recipientSignatureChecksum: recipientUpload.checksum,
        };

        if (issuerSig) {
          const issuerUpload = await uploadMaterialIssueSignature({
            projectId,
            issueId: issue.id,
            file: issuerSig,
            documentType: 'issuer_signature',
          });
          attachInput.issuerSignatureDocumentId = issuerUpload.documentId;
          attachInput.issuerSignatureChecksum = issuerUpload.checksum;
        }

        await attachMaterialIssueSignatures(issue.id, attachInput);
        const submitted = await submitMaterialIssue(issue.id);

        Alert.alert(
          'Submitted',
          `${submitted.issueNumber} submitted with signatures.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        const recipientSignatureChecksum =
          await computeLocalFileSha256(recipientSig);
        const issuerSignatureChecksum = issuerSig
          ? await computeLocalFileSha256(issuerSig)
          : null;

        await enqueue(
          buildMaterialIssueOfflineEnqueue({
            ...validated.payload,
            items: issueItems,
            offlineCapturedAt: new Date().toISOString(),
            recipientSignature: recipientSig,
            issuerSignature: issuerSig,
            recipientSignatureChecksum,
            issuerSignatureChecksum,
          }),
        );
        Alert.alert(
          'Queued',
          'Material issue with signatures queued offline. It will create, attach signatures, and submit when you are back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      if (isForbiddenError(err)) {
        setError(
          'Permission denied — stock.issue and document.upload are required.',
        );
      } else {
        setError(getErrorMessage(err, 'Could not submit material issue'));
      }
    } finally {
      setSaving(false);
    }
  }, [
    blockId,
    boqItemId,
    canCreate,
    canUpload,
    contractorId,
    draft,
    enqueue,
    floorId,
    isOnline,
    issueDate,
    issuerSig,
    lines,
    navigation,
    notes,
    receivedBy,
    recipientSig,
    selectedProject?.id,
    storeLocation,
    workLocation,
  ]);

  if (!canCreate) {
    return (
      <Screen title="New material issue" subtitle="Permission required">
        <Text style={styles.error}>
          Permission denied — stock.issue is required to create material issues.
        </Text>
      </Screen>
    );
  }

  if (!canUpload) {
    return (
      <Screen title="New material issue" subtitle="Permission required">
        <Text style={styles.error}>
          Permission denied — document.upload is required to capture signatures.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="New material issue"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · issue stock to site`
          : 'Select a project first'
      }
    >
      {lookupError ? (
        <View style={styles.errorBox}>
          <Text style={styles.hint}>{lookupError}</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => void loadLookups()}>
            <Text style={styles.secondaryBtnText}>Retry lookups</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loadingLookups ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}

      <Text style={styles.label}>Issue date</Text>
      <TextInput
        style={styles.input}
        value={issueDate}
        onChangeText={setIssueDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Received by</Text>
      {canViewUsers && recipients.length > 0 ? (
        <View style={styles.chipRow}>
          {recipients.slice(0, 12).map((person) => {
            const selected = receivedBy === person.id;
            return (
              <Pressable
                key={person.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setReceivedBy(person.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
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
          value={receivedBy}
          onChangeText={setReceivedBy}
          placeholder="User id"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      )}

      <Text style={styles.label}>BOQ item</Text>
      {boqItems.length > 0 ? (
        <View style={styles.chipRow}>
          {boqItems.slice(0, 10).map((row) => {
            const selected = boqItemId === row.id;
            return (
              <Pressable
                key={row.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setBoqItemId(row.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {row.boqCode}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={boqItemId}
        onChangeText={setBoqItemId}
        placeholder="BOQ item id"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />
      {selectedBoq ? (
        <Text style={styles.meta}>
          {selectedBoq.description} · {selectedBoq.unit}
        </Text>
      ) : null}

      <Text style={styles.label}>Work location</Text>
      <TextInput
        style={styles.input}
        value={workLocation}
        onChangeText={setWorkLocation}
        placeholder="Block A – Column casting"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Store location (optional)</Text>
      <TextInput
        style={styles.input}
        value={storeLocation}
        onChangeText={setStoreLocation}
        placeholder="Main Store"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Contractor (optional)</Text>
      {contractors.length > 0 ? (
        <View style={styles.chipRow}>
          {contractors.slice(0, 8).map((row) => {
            const selected = contractorId === row.id;
            return (
              <Pressable
                key={row.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setContractorId(selected ? '' : row.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {row.contractorCode}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={contractorId}
        onChangeText={setContractorId}
        placeholder="Contractor id"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Block id (optional)</Text>
      <TextInput
        style={styles.input}
        value={blockId}
        onChangeText={setBlockId}
        placeholder="Mongo id"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Floor (optional)</Text>
      <TextInput
        style={styles.input}
        value={floorId}
        onChangeText={setFloorId}
        placeholder="L2"
        placeholderTextColor={colors.textMuted}
      />

      {lines.map((line, index) => (
        <View key={`line-${index}`} style={styles.lineCard}>
          <Text style={styles.lineTitle}>Material line {index + 1}</Text>
          {materials.length > 0 ? (
            <View style={styles.chipRow}>
              {materials.slice(0, 8).map((material) => {
                const selected = line.materialId === material.id;
                return (
                  <Pressable
                    key={material.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => applyMaterial(index, material)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {material.materialCode || material.materialName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Text style={styles.label}>Material id</Text>
          <TextInput
            style={styles.input}
            value={line.materialId}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, materialId: value, materialLabel: value }
                    : row,
                ),
              )
            }
            placeholder="Material id"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={line.quantityText}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, quantityText: value } : row,
                ),
              )
            }
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Unit</Text>
          <TextInput
            style={styles.input}
            value={line.unit}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, unit: value } : row,
                ),
              )
            }
            placeholder="bag"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Batch (optional)</Text>
          <TextInput
            style={styles.input}
            value={line.batch}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, batch: value } : row,
                ),
              )
            }
            placeholder="Batch"
            placeholderTextColor={colors.textMuted}
          />
          {lines.length > 1 ? (
            <Pressable
              onPress={() =>
                setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
              }
            >
              <Text style={styles.link}>Remove line</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => setLines((prev) => [...prev, emptyLine()])}
      >
        <Text style={styles.secondaryBtnText}>Add material line</Text>
      </Pressable>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Optional notes"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.sectionTitle}>Signatures</Text>
      <Text style={styles.hint}>
        Recipient signature is required before submit. Issuer / engineer
        signature is optional.
      </Text>
      <SignatureCaptureField
        label="Recipient signature"
        required
        file={recipientSig}
        disabled={saving}
        onCaptured={setRecipientSig}
      />
      <SignatureCaptureField
        label="Issuer / engineer signature"
        file={issuerSig}
        disabled={saving}
        onCaptured={setIssuerSig}
      />

      <Pressable
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        disabled={saving || !selectedProject?.id}
        onPress={() => void submit()}
      >
        {saving ? (
          <ActivityIndicator color="#F4F0E6" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {isOnline ? 'Submit material issue' : 'Queue issue offline'}
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
  meta: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  sectionTitle: {
    marginTop: 20,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  hint: { color: colors.textMuted, lineHeight: 20, marginTop: 6 },
  error: { color: colors.danger, marginBottom: 10, lineHeight: 20 },
  errorBox: { marginBottom: 12, gap: 8 },
  link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: '#F4F0E6' },
  lineCard: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lineTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
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
  spinner: { marginVertical: 12 },
});
