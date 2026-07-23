import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { createCostCentre, fetchCostCentres } from './api';
import { resolveProjectFinanceCapabilities } from './permissions';
import { suggestCostCentreCode } from './suggestCostCentreCode';
import { CostCentreKind } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'QuickCreateCostCentre'>;

export function QuickCreateCostCentreScreen({ navigation, route }: Props) {
  const returnKind = route.params?.returnKind ?? 'expense';
  const { hasPermission } = useAuth();
  const caps = resolveProjectFinanceCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [knownCodes, setKnownCodes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCode(true);
    void (async () => {
      try {
        const rows = await fetchCostCentres({});
        if (cancelled) return;
        const codes = rows.map((row) => row.code);
        setKnownCodes(codes);
        setCode(
          suggestCostCentreCode({
            projectName: selectedProject?.projectName,
            projectCode: selectedProject?.projectCode,
            kind: CostCentreKind.CostCentre,
            existingCodes: codes,
          }),
        );
        setCodeTouched(false);
      } catch {
        if (cancelled) return;
        setKnownCodes([]);
        setCode(
          suggestCostCentreCode({
            projectName: selectedProject?.projectName,
            projectCode: selectedProject?.projectCode,
            kind: CostCentreKind.CostCentre,
            existingCodes: [],
          }),
        );
      } finally {
        if (!cancelled) setLoadingCode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProject?.projectCode, selectedProject?.projectName]);

  if (!caps.canManageCostCentres) {
    return (
      <Screen title="New cost centre" subtitle="Permission required">
        <Text style={styles.error}>You need cost_centre.manage.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Code is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createCostCentre({
        code: trimmedCode,
        name: trimmedName,
        kind: CostCentreKind.CostCentre,
        projectId: selectedProject?.id ?? null,
        notes: notes.trim() || null,
      });
      Alert.alert('Created', `${created.code} · ${created.name}`);
      navigation.navigate({
        name: 'ProjectFinanceEntry',
        params: {
          kind: returnKind,
          createdCostCentreId: created.id,
        },
        merge: true,
      });
    } catch (err) {
      const nextCodes = [...knownCodes, trimmedCode];
      setKnownCodes(nextCodes);
      setCode(
        suggestCostCentreCode({
          projectName: selectedProject?.projectName,
          projectCode: selectedProject?.projectCode,
          kind: CostCentreKind.CostCentre,
          existingCodes: nextCodes,
        }),
      );
      setCodeTouched(false);
      setError(getErrorMessage(err, 'Create failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="New cost centre"
      subtitle={selectedProject?.projectCode ?? 'Company-wide'}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Footing"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Code (auto)</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(v) => {
          setCodeTouched(true);
          setCode(v.toUpperCase());
        }}
        editable={!loadingCode}
        placeholder="LUX-2026-MADAMB-CC-001"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
      />
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <View style={styles.hintBox}>
        <Text style={styles.hint}>
          {codeTouched
            ? 'Custom code. Normal format: LUX-year-project-CC-number.'
            : 'Auto: LUX-{year}-{project}-CC-{number}'}
        </Text>
      </View>
      <Pressable
        style={[styles.btn, (saving || loadingCode) && styles.disabled]}
        disabled={saving || loadingCode}
        onPress={() => void submit()}
      >
        <Text style={styles.btnText}>{saving ? 'Creating…' : 'Create'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.danger, marginBottom: 8 },
  hintBox: { marginTop: 12 },
  hint: { color: colors.textMuted, fontSize: 13 },
  btn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
