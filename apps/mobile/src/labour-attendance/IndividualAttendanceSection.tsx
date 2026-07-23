import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { AttendanceWorkerDraft } from './buildAttendanceCreatePayload';
import { WorkerChecklist } from './WorkerChecklist';

type Props = {
  workers: AttendanceWorkerDraft[];
  onChange: (workers: AttendanceWorkerDraft[]) => void;
};

/**
 * Individual entry mode: named workers with optional check-in/out and OT.
 * Group mode uses a single workerCount field instead.
 */
export function IndividualAttendanceSection({ workers, onChange }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Individual workers</Text>
      <Text style={styles.hint}>
        Add each worker by name. Headcount is derived from the worker list.
      </Text>
      <WorkerChecklist workers={workers} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 12 },
  heading: { color: colors.text, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.textMuted, marginBottom: 8, fontSize: 13 },
});
