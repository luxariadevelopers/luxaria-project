import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { useOfflineSync } from '@/offline';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  createPurchaseRequest,
  listMaterials,
  submitPurchaseRequest,
} from './api';
import { buildPurchaseRequestOfflineEnqueue } from './buildPurchaseRequestOfflineEnqueue';
import { resolvePurchaseRequestCapabilities } from './permissions';
import type { MaterialOption } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PurchaseRequestForm'>;

export function PurchaseRequestFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('10');
  const [unit, setUnit] = useState('nos');
  const [requiredByDate, setRequiredByDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    void listMaterials().then((rows) => {
      setMaterials(rows);
      if (!materialId && rows[0]) {
        setMaterialId(rows[0].id);
        if (rows[0].baseUnit) setUnit(rows[0].baseUnit);
      }
    }).catch((err) => setError(getErrorMessage(err, 'Could not load materials')));
  }, [isOnline, materialId]);

  if (!caps.canRequest) {
    return (
      <Screen title="New purchase request" subtitle="Permission required">
        <Text style={styles.error}>You need purchase.request.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!selectedProject?.id) { setError('Select a project first'); return; }
    const n = Number(qty);
    if (!materialId || !(n > 0) || !justification.trim()) {
      setError('Material, quantity and justification are required');
      return;
    }
    if (!isOnline && !materials.length) {
      setError('Load materials while online first, then capture offline.');
      return;
    }
    setSaving(true); setError(null);
    const payload = {
      projectId: selectedProject.id,
      requiredByDate,
      justification: justification.trim(),
      items: [{ materialId, requestedQuantity: n, unit }],
      offlineCapturedAt: new Date().toISOString(),
    };
    try {
      if (isOnline) {
        const created = await createPurchaseRequest(payload);
        const submitted = await submitPurchaseRequest(created.id);
        Alert.alert('Submitted', submitted.requestNumber);
        navigation.replace('PurchaseRequestDetail', { requestId: submitted.id });
      } else {
        await enqueue(buildPurchaseRequestOfflineEnqueue(payload));
        Alert.alert(
          'Queued',
          'Purchase request saved offline. It will sync when you are back online.',
        );
        navigation.goBack();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create PR'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="New purchase request" subtitle={selectedProject?.projectCode ?? 'Select project'}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Required by</Text>
      <TextInput style={styles.input} value={requiredByDate} onChangeText={setRequiredByDate} />
      <Text style={styles.label}>Material id</Text>
      <TextInput style={styles.input} value={materialId} onChangeText={setMaterialId} autoCapitalize="none" />
      <View style={styles.chips}>
        {materials.slice(0, 6).map((m) => (
          <Pressable key={m.id} style={[styles.chip, materialId === m.id && styles.chipActive]} onPress={() => {
            setMaterialId(m.id);
            if (m.baseUnit) setUnit(m.baseUnit);
          }}>
            <Text style={styles.chipText}>{m.materialCode || m.materialName}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Quantity</Text>
      <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
      <Text style={styles.label}>Unit</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} autoCapitalize="none" />
      <Text style={styles.label}>Justification</Text>
      <TextInput style={[styles.input, styles.multiline]} value={justification} onChangeText={setJustification} multiline />
      <Pressable style={[styles.submit, saving && styles.disabled]} disabled={saving} onPress={() => void submit()}>
        <Text style={styles.submitText}>
          {saving ? 'Saving…' : isOnline ? 'Create & submit' : 'Save offline & submit'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  submit: { marginTop: 20, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
