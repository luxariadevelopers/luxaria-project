import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
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
import { colors, spacing, typography } from '@/theme';
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
  const [lookupHint, setLookupHint] = useState<string | null>(null);

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
      setLookupHint(
        'Load materials and BOQ items while online, then capture offline.',
      );
      return;
    }

    setLoadingLookups(true);
    setLookupError(null);
    setLookupHint(null);
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
        setLookupHint(
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
        <AsyncStatePanel
          forbidden
          error="Permission denied — stock.issue is required to create material issues."
        />
      </Screen>
    );
  }

  if (!canUpload) {
    return (
      <Screen title="New material issue" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="Permission denied — document.upload is required to capture signatures."
        />
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
        <AsyncStatePanel
          error={lookupError}
          onRetry={() => void loadLookups()}
        />
      ) : null}
      {lookupHint ? <Text style={styles.hint}>{lookupHint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loadingLookups ? (
        <AsyncStatePanel loading loadingLabel="Loading lookups…" />
      ) : null}

      <FormSection title="Issue header">
        <TextField
          label="Issue date"
          value={issueDate}
          onChangeText={setIssueDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Received by</Text>
        {canViewUsers && recipients.length > 0 ? (
          <View style={styles.chipRow}>
            {recipients.slice(0, 12).map((person) => (
              <Chip
                key={person.id}
                label={person.fullName}
                selected={receivedBy === person.id}
                onPress={() => setReceivedBy(person.id)}
              />
            ))}
          </View>
        ) : (
          <TextField
            value={receivedBy}
            onChangeText={setReceivedBy}
            placeholder="User id"
            autoCapitalize="none"
          />
        )}

        <Text style={styles.label}>BOQ item</Text>
        {boqItems.length > 0 ? (
          <View style={styles.chipRow}>
            {boqItems.slice(0, 10).map((row) => (
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
          placeholder="BOQ item id"
          autoCapitalize="none"
        />
        {selectedBoq ? (
          <Text style={styles.meta}>
            {selectedBoq.description} · {selectedBoq.unit}
          </Text>
        ) : null}

        <TextField
          label="Work location"
          value={workLocation}
          onChangeText={setWorkLocation}
          placeholder="Block A – Column casting"
        />
        <TextField
          label="Store location (optional)"
          value={storeLocation}
          onChangeText={setStoreLocation}
          placeholder="Main Store"
        />

        <Text style={styles.label}>Contractor (optional)</Text>
        {contractors.length > 0 ? (
          <View style={styles.chipRow}>
            {contractors.slice(0, 8).map((row) => (
              <Chip
                key={row.id}
                label={row.contractorCode}
                selected={contractorId === row.id}
                onPress={() => setContractorId(contractorId === row.id ? '' : row.id)}
              />
            ))}
          </View>
        ) : null}
        <TextField
          value={contractorId}
          onChangeText={setContractorId}
          placeholder="Contractor id"
          autoCapitalize="none"
        />

        <TextField
          label="Block id (optional)"
          value={blockId}
          onChangeText={setBlockId}
          placeholder="Mongo id"
          autoCapitalize="none"
        />
        <TextField
          label="Floor (optional)"
          value={floorId}
          onChangeText={setFloorId}
          placeholder="L2"
          containerStyle={styles.fieldFlush}
        />
      </FormSection>

      {lines.map((line, index) => (
        <FormSection key={`line-${index}`} title={`Material line ${index + 1}`}>
          {materials.length > 0 ? (
            <View style={styles.chipRow}>
              {materials.slice(0, 8).map((material) => (
                <Chip
                  key={material.id}
                  label={material.materialCode || material.materialName}
                  selected={line.materialId === material.id}
                  onPress={() => applyMaterial(index, material)}
                />
              ))}
            </View>
          ) : null}
          <TextField
            label="Material id"
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
            autoCapitalize="none"
          />
          <TextField
            label="Quantity"
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
          />
          <TextField
            label="Unit"
            value={line.unit}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, unit: value } : row,
                ),
              )
            }
            placeholder="bag"
            autoCapitalize="none"
          />
          <TextField
            label="Batch (optional)"
            value={line.batch}
            onChangeText={(value) =>
              setLines((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, batch: value } : row,
                ),
              )
            }
            placeholder="Batch"
            containerStyle={styles.fieldFlush}
          />
          {lines.length > 1 ? (
            <Button
              label="Remove line"
              variant="ghost"
              onPress={() =>
                setLines((prev) =>
                  prev.filter((_, rowIndex) => rowIndex !== index),
                )
              }
              style={styles.removeBtn}
            />
          ) : null}
        </FormSection>
      ))}

      <Button
        label="Add material line"
        variant="secondary"
        onPress={() => setLines((prev) => [...prev, emptyLine()])}
      />

      <FormSection title="Notes" framed={false}>
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes"
          style={styles.notes}
        />
      </FormSection>

      <FormSection
        title="Signatures"
        description="Recipient signature is required before submit. Issuer / engineer signature is optional."
        framed={false}
      >
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
      </FormSection>

      <Button
        label={isOnline ? 'Submit material issue' : 'Queue issue offline'}
        loading={saving}
        disabled={!selectedProject?.id}
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
    marginTop: spacing.sm,
  },
  meta: { ...typography.meta, marginBottom: spacing.md },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  hint: {
    ...typography.meta,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  fieldFlush: { marginBottom: 0 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  removeBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  submit: { marginTop: spacing.md, marginBottom: spacing.xxxl },
});
