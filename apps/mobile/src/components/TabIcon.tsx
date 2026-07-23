import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export type TabIconName = 'home' | 'projects' | 'sync' | 'profile';

const GLYPHS: Record<TabIconName, string> = {
  home: '⌂',
  projects: '▦',
  sync: '↻',
  profile: '◉',
};

type Props = {
  name: TabIconName;
  focused: boolean;
  badgeCount?: number;
};

export function TabIcon({ name, focused, badgeCount }: Props) {
  const color = focused ? colors.primary : colors.textMuted;
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.glyph, { color }]}>{GLYPHS[name]}</Text>
      {showBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '800',
  },
});
