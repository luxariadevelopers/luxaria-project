import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, spacing, typography } from '@/theme';
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
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => removeAt(index)}
              style={styles.removeBtn}
            />
          </View>

          <TextField
            label="Name *"
            value={worker.workerName}
            onChangeText={(workerName) => updateAt(index, { workerName })}
            placeholder="Worker name"
            containerStyle={styles.field}
          />
          <TextField
            label="Code (optional)"
            value={worker.workerCode ?? ''}
            onChangeText={(workerCode) => updateAt(index, { workerCode })}
            autoCapitalize="characters"
            placeholder="W-001"
            containerStyle={styles.field}
          />
          <TextField
            label="Check-in (ISO optional)"
            value={worker.checkIn ?? ''}
            onChangeText={(checkIn) => updateAt(index, { checkIn })}
            autoCapitalize="none"
            placeholder="2026-07-20T08:00:00.000Z"
            containerStyle={styles.field}
          />
          <TextField
            label="Check-out (ISO optional)"
            value={worker.checkOut ?? ''}
            onChangeText={(checkOut) => updateAt(index, { checkOut })}
            autoCapitalize="none"
            placeholder="2026-07-20T17:30:00.000Z"
            containerStyle={styles.field}
          />
          <TextField
            label="Overtime hours"
            value={String(worker.overtimeHours ?? '0')}
            onChangeText={(overtimeHours) => updateAt(index, { overtimeHours })}
            keyboardType="numeric"
            containerStyle={styles.field}
          />
          <TextField
            label="Remarks"
            value={worker.remarks ?? ''}
            onChangeText={(remarks) => updateAt(index, { remarks })}
            containerStyle={styles.fieldLast}
          />
        </View>
      ))}

      <Button
        label="Add worker"
        variant="secondary"
        onPress={() => onChange([...workers, emptyWorker()])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.xs,
  },
  empty: {
    ...typography.meta,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyStrong,
  },
  removeBtn: {
    minWidth: 88,
    paddingVertical: spacing.sm,
  },
  field: {
    marginBottom: spacing.sm,
  },
  fieldLast: {
    marginBottom: 0,
  },
});
