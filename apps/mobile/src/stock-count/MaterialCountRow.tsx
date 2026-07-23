import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { TextField } from '@/components/TextField';
import { colors, spacing, typography } from '@/theme';
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
    <FormSection
      title={title}
      description={`System ${line.systemQuantity} ${line.baseUnit} · Variance ${difference}`}
    >
      <TextField
        label="Physical qty"
        keyboardType="decimal-pad"
        value={
          Number.isFinite(line.physicalQuantity)
            ? String(line.physicalQuantity)
            : ''
        }
        onChangeText={onChangePhysical}
        placeholder="0"
        error={errors?.physicalQuantity}
        containerStyle={styles.field}
      />

      {needsReason ? (
        <TextField
          label="Variance reason (required)"
          value={line.reason}
          onChangeText={onChangeReason}
          placeholder="Explain the difference"
          multiline
          error={errors?.reason}
          containerStyle={styles.field}
        />
      ) : null}

      <View style={styles.photoRow}>
        <Button
          label={line.photoUri ? 'Retake photo' : 'Add photo'}
          variant="secondary"
          onPress={onCapturePhoto}
          style={styles.photoBtn}
        />
        {line.photoUri ? (
          <Button
            label="Clear"
            variant="ghost"
            onPress={onClearPhoto}
            style={styles.clearBtn}
          />
        ) : null}
      </View>
      {line.photoUri ? (
        <Text style={styles.meta} numberOfLines={1}>
          Photo: {line.photoName ?? 'captured'}
        </Text>
      ) : null}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  photoBtn: { alignSelf: 'flex-start' },
  clearBtn: { minWidth: 72 },
  meta: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
