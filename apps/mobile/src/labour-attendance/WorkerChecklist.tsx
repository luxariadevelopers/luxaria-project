import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { AttendanceWorkerDraft } from './buildAttendanceCreatePayload';

type Props = {
  workers: AttendanceWorkerDraft[];
  onChange: (workers: AttendanceWorkerDraft[]) => void;
};

const emptyWorker = (): AttendanceWorkerDraft => ({
  workerName: '',
  workerCode: '',
  checkIn: '',
  checkOut: '',
  overtimeHours: '0',
  remarks: '',
});

export function WorkerChecklist({ workers, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<AttendanceWorkerDraft>) => {
    onChange(
      workers.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeAt = (index: number) => {
    onChange(workers.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.root}>
      {workers.length === 0 ? (
        <Text style={styles.empty}>No workers yet — add named workers below.</Text>
      ) : null}

      {workers.map((worker, index) => (
        <View key={`worker-${index}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Worker {index + 1}</Text>
            <Pressable onPress={() => removeAt(index)} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={worker.workerName}
            onChangeText={(workerName) => updateAt(index, { workerName })}
            placeholder="Worker name"
          />

          <Text style={styles.label}>Code (optional)</Text>
          <TextInput
            style={styles.input}
            value={worker.workerCode ?? ''}
            onChangeText={(workerCode) => updateAt(index, { workerCode })}
            autoCapitalize="characters"
            placeholder="W-001"
          />

          <Text style={styles.label}>Check-in (ISO optional)</Text>
          <TextInput
            style={styles.input}
            value={worker.checkIn ?? ''}
            onChangeText={(checkIn) => updateAt(index, { checkIn })}
            autoCapitalize="none"
            placeholder="2026-07-20T08:00:00.000Z"
          />

          <Text style={styles.label}>Check-out (ISO optional)</Text>
          <TextInput
            style={styles.input}
            value={worker.checkOut ?? ''}
            onChangeText={(checkOut) => updateAt(index, { checkOut })}
            autoCapitalize="none"
            placeholder="2026-07-20T17:30:00.000Z"
          />

          <Text style={styles.label}>Overtime hours</Text>
          <TextInput
            style={styles.input}
            value={String(worker.overtimeHours ?? '0')}
            onChangeText={(overtimeHours) => updateAt(index, { overtimeHours })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={styles.input}
            value={worker.remarks ?? ''}
            onChangeText={(remarks) => updateAt(index, { remarks })}
          />
        </View>
      ))}

      <Pressable
        style={styles.add}
        onPress={() => onChange([...workers, emptyWorker()])}
      >
        <Text style={styles.addText}>Add worker</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 4 },
  empty: { color: colors.textMuted, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { color: colors.text, fontWeight: '600' },
  remove: { color: colors.danger, fontSize: 13 },
  label: { color: colors.textMuted, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  add: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addText: { color: colors.primary, fontWeight: '600' },
});
