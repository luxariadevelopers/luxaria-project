import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, hitSlopMin, radii, spacing, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  leftSlot,
  style,
  testID,
}: Props) {
  const busy = Boolean(loading || disabled);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        busy && styles.disabled,
        pressed && !busy && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.primary : '#F4F0E6'}
        />
      ) : (
        <>
          {leftSlot}
          <Text
            style={[
              styles.label,
              variant === 'secondary' || variant === 'ghost'
                ? styles.labelDark
                : styles.labelLight,
              variant === 'danger' && styles.labelLight,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitSlopMin,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    ...typography.button,
  },
  labelLight: {
    color: '#F4F0E6',
  },
  labelDark: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.88,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});
