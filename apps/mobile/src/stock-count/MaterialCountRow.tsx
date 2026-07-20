import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { CountLine } from './types';
import type { CountLineFieldErrors } from './validation';
import { computeDifference, differenceRequiresReason } from './variance';

type Props = {
  line: CountLine;
  errors?: CountLineFieldErrors;
  onChangePhysical: (value: string) => void;
  onChangeReason: (value: string) => void;
  onCapturePhoto: () => void;
  onClearPhoto: () => void;
};

export function MaterialCountRow({
  line,
  errors,
  onChangePhysical,
  onChangeReason,
  onCapturePhoto,
  onClearPhoto,
}: Props) {
  const difference = computeDifference(
    line.physicalQuantity,
    line.systemQuantity,
  );
  const needsReason = differenceRequiresReason(difference);
  const title =
    [line.materialCode, line.materialName].filter(Boolean).join(' · ') ||
    line.materialId;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>
        System {line.systemQuantity} {line.baseUnit} · Variance {difference}
      </Text>

      <Text style={styles.label}>Physical qty</Text>
      <TextInput
        style={[styles.input, errors?.physicalQuantity ? styles.inputError : null]}
        keyboardType="decimal-pad"
        value={
          Number.isFinite(line.physicalQuantity)
            ? String(line.physicalQuantity)
            : ''
        }
        onChangeText={onChangePhysical}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
      />
      {errors?.physicalQuantity ? (
        <Text style={styles.error}>{errors.physicalQuantity}</Text>
      ) : null}

      {needsReason ? (
        <>
          <Text style={styles.label}>Variance reason (required)</Text>
          <TextInput
            style={[styles.input, errors?.reason ? styles.inputError : null]}
            value={line.reason}
            onChangeText={onChangeReason}
            placeholder="Explain the difference"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          {errors?.reason ? (
            <Text style={styles.error}>{errors.reason}</Text>
          ) : null}
        </>
      ) : null}

      <View style={styles.photoRow}>
        <Pressable style={styles.photoBtn} onPress={onCapturePhoto}>
          <Text style={styles.photoBtnText}>
            {line.photoUri ? 'Retake photo' : 'Add photo'}
          </Text>
        </Pressable>
        {line.photoUri ? (
          <Pressable onPress={onClearPhoto}>
            <Text style={styles.clearPhoto}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {line.photoUri ? (
        <Text style={styles.meta} numberOfLines={1}>
          Photo: {line.photoName ?? 'captured'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: '#B42318' },
  error: { color: '#B42318', marginTop: 4, fontSize: 12 },
  photoRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  photoBtnText: { color: colors.primary, fontWeight: '600' },
  clearPhoto: { color: colors.textMuted, fontWeight: '600' },
});
