import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When false, children render without the bordered surface (e.g. ListRow stacks). */
  framed?: boolean;
};

export function FormSection({
  title,
  description,
  children,
  style,
  framed = true,
}: Props) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={framed ? styles.body : styles.bodyPlain}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.meta,
    marginBottom: spacing.md,
  },
  body: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bodyPlain: {
    gap: spacing.xs,
  },
});
