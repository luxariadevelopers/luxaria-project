import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { approveApproval, getApproval, rejectApproval } from './api';
import { resolveApprovalCapabilities } from './permissions';
import type { PublicApprovalRequest } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'ApprovalDetail'>;

export function ApprovalDetailScreen({ route }: Props) {
  const { approvalId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveApprovalCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicApprovalRequest | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView || !selectedProject?.id) {
      setForbidden(!caps.canView);
      setError(!selectedProject?.id ? 'Select a project first' : 'Missing approval.view');
      setLoading(false);
      return;
    }
    if (!isOnline) { setError('Go online to open approval'); setLoading(false); return; }
    setLoading(true);
    try {
      setItem(await getApproval(selectedProject.id, approvalId));
      setError(null); setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load approval'));
    } finally {
      setLoading(false);
    }
  }, [approvalId, caps.canView, isOnline, selectedProject?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const act = async (kind: 'approve' | 'reject') => {
    if (!selectedProject?.id || !item) return;
    setActing(true);
    try {
      const updated = kind === 'approve'
        ? await approveApproval(selectedProject.id, item.id, comment.trim() || null)
        : await rejectApproval(selectedProject.id, item.id, comment.trim() || null);
      setItem(updated);
      Alert.alert(kind === 'approve' ? 'Approved' : 'Rejected', updated.approvalCode);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Action failed'));
    } finally {
      setActing(false);
    }
  };

  const actionable = item && ['pending', 'in_progress', 'submitted'].includes(String(item.status).toLowerCase());

  return (
    <Screen title="Approval" subtitle={item?.approvalCode ?? approvalId}>
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !item} emptyLabel="Not found" onRetry={() => void load()} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Module: {item.module}/{item.entityType}</Text>
          <Text style={styles.row}>Amount: ₹{item.amount}</Text>
          <Text style={styles.row}>Step: {item.currentStep}</Text>
          {item.reason ? <Text style={styles.row}>Reason: {item.reason}</Text> : null}
          {caps.canAct && actionable ? (
            <>
              <Text style={styles.label}>Comment</Text>
              <TextInput style={styles.input} value={comment} onChangeText={setComment} />
              <Pressable style={[styles.btn, acting && styles.disabled]} disabled={acting} onPress={() => void act('approve')}>
                <Text style={styles.btnText}>{acting ? 'Working…' : 'Approve'}</Text>
              </Pressable>
              <Pressable style={[styles.btnDanger, acting && styles.disabled]} disabled={acting} onPress={() => void act('reject')}>
                <Text style={styles.btnText}>Reject</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, gap: 8 },
  row: { color: colors.text, fontSize: 15 },
  label: { color: colors.textMuted, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 10, backgroundColor: colors.background },
  btn: { marginTop: 12, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' },
  btnDanger: { marginTop: 8, backgroundColor: colors.danger, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
