import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, hitSlopMin, radii, spacing } from '@/theme';

type Props = {
  /** Accessible label (required for icon-only controls). */
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  /** Fallback glyph when children omitted. */
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'primary' | 'danger';
};

export function IconButton({
  accessibilityLabel,
  onPress,
  disabled,
  children,
  glyph,
  style,
  tone = 'default',
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.base,
        tone === 'primary' && styles.primary,
        tone === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children ?? (
        <Text
          style={[
            styles.glyph,
            tone === 'primary' && styles.glyphOnPrimary,
            tone === 'danger' && styles.glyphOnDanger,
          ]}
        >
          {glyph ?? '·'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: hitSlopMin,
    minHeight: hitSlopMin,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  glyph: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  glyphOnPrimary: {
    color: '#F4F0E6',
  },
  glyphOnDanger: {
    color: '#fff',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
