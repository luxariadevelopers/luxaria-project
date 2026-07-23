import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { createLead, type LeadSource } from '@/leads/api';
import {
  clearLeadDraft,
  loadLeadDraft,
  saveLeadDraft,
} from '@/leads/leadDraftStorage';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';

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
      <FormSection title="Contact">
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Buyer name"
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Mobile number"
        />
      </FormSection>

      <FormSection title="Source">
        <View style={styles.sourceRow}>
          {SOURCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={source === opt.value}
              onPress={() => setSource(opt.value)}
            />
          ))}
        </View>
      </FormSection>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={isOnline ? 'Submit lead' : 'Save draft'}
        loading={saving}
        disabled={saving}
        onPress={() => void handleSubmit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
