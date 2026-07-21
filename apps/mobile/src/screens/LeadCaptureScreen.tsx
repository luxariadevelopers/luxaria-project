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
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { createLead, type LeadSource } from '@/leads/api';
import {
  clearLeadDraft,
  loadLeadDraft,
  saveLeadDraft,
} from '@/leads/leadDraftStorage';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'LeadCapture'>;

const SOURCE_OPTIONS: Array<{ value: LeadSource; label: string }> = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'broker', label: 'Broker' },
  { value: 'digital_marketing', label: 'Digital' },
  { value: 'other', label: 'Other' },
];

export function LeadCaptureScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canCreate = hasPermission('lead.manage');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('walk_in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLeadDraft().then((draft) => {
      if (!draft) return;
      setFullName(draft.fullName);
      setPhone(draft.phone);
      setSource(draft.source as LeadSource);
    });
  }, []);

  const persistDraft = async () => {
    await saveLeadDraft({
      fullName,
      phone,
      source,
      savedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = async () => {
    if (!canCreate) {
      setError('You need lead.manage permission to capture leads.');
      return;
    }
    if (!fullName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone is required.');
      return;
    }
    if (!isOnline) {
      await persistDraft();
      Alert.alert(
        'Saved offline',
        'Lead draft saved locally. Submit again when online.',
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const lead = await createLead({
        projectId: selectedProject?.id ?? null,
        source,
        contact: {
          fullName: fullName.trim(),
          phone: phone.trim(),
        },
      });
      await clearLeadDraft();
      Alert.alert('Lead captured', `${lead.leadNumber} created.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create lead'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Capture lead" subtitle="Quick CRM lead entry">
      <View style={styles.field}>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Buyer name"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Mobile number"
        />
      </View>
      <Text style={styles.label}>Source</Text>
      <View style={styles.sourceRow}>
        {SOURCE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.sourceChip,
              source === opt.value && styles.sourceChipActive,
            ]}
            onPress={() => setSource(opt.value)}
          >
            <Text
              style={[
                styles.sourceChipText,
                source === opt.value && styles.sourceChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        disabled={saving}
        onPress={() => void handleSubmit()}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Submitting…' : isOnline ? 'Submit lead' : 'Save draft'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    color: colors.text,
    fontSize: 16,
  },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sourceChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  sourceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sourceChipText: { color: colors.text, fontWeight: '600' },
  sourceChipTextActive: { color: '#F4F0E6' },
  error: { color: '#B42318', marginBottom: 12 },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#F4F0E6', fontWeight: '700' },
});
