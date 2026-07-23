import { useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { NetworkBanner } from './NetworkBanner';

type Props = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  scroll?: boolean;
  rightSlot?: ReactNode;
  /**
   * Force in-screen title visibility.
   * Default: hide when a native stack header is already shown (avoids double titles).
   */
  showHeader?: boolean;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  rightSlot,
  showHeader,
}: Props) {
  const headerHeight = useContext(HeaderHeightContext);
  const stackHeaderVisible =
    typeof headerHeight === 'number' && headerHeight > 0;
  const showInScreenHeader = showHeader ?? !stackHeaderVisible;
  const showTitleBlock =
    showInScreenHeader && (Boolean(title) || Boolean(rightSlot));
  const showContextSubtitle = !showTitleBlock && Boolean(subtitle);

  const body = (
    <View style={styles.body}>
      {showTitleBlock ? (
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
      ) : null}
      {showContextSubtitle ? (
        <View style={styles.contextRow}>
          <Text style={styles.contextSubtitle}>{subtitle}</Text>
          {rightSlot}
        </View>
      ) : null}
      {!showTitleBlock && !showContextSubtitle && rightSlot ? (
        <View style={styles.rightOnly}>{rightSlot}</View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={
        stackHeaderVisible ? ['left', 'right'] : ['top', 'left', 'right']
      }
    >
      <NetworkBanner />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl - 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: spacing.sm - 2,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  contextSubtitle: {
    ...typography.meta,
    flex: 1,
  },
  rightOnly: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
});
