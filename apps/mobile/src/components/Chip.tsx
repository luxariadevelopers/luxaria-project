import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, hitSlopMin, radii, spacing, typography } from '@/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional leading meta (e.g. "Project"). */
  hint?: string;
};

export function Chip({
  label,
  selected,
  onPress,
  disabled,
  style,
  hint,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {hint ? (
        <Text style={[styles.hint, selected && styles.hintSelected]}>{hint}</Text>
      ) : null}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: hitSlopMin,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  hint: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 2,
    fontSize: 10,
  },
  hintSelected: {
    color: '#E8DFC8',
  },
  label: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  labelSelected: {
    color: '#F4F0E6',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
  },
});
