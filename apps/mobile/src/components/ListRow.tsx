import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, hitSlopMin, radii, spacing, typography } from '@/theme';

type Props = {
  title: string;
  meta?: string;
  status?: string;
  statusTone?: 'default' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function ListRow({
  title,
  meta,
  status,
  statusTone = 'default',
  onPress,
  rightSlot,
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {status ? (
          <Text style={[styles.status, statusToneStyles[statusTone]]}>
            {status}
          </Text>
        ) : null}
        {rightSlot}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: hitSlopMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.meta,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  status: {
    ...typography.label,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: '#F8F5EE',
  },
  disabled: {
    opacity: 0.55,
  },
});

const statusToneStyles = StyleSheet.create({
  default: { color: colors.textMuted },
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
});
