import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { colors } from '@/theme/colors';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function HomeScreen() {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { activeCount } = useOfflineSync();
  const navigation = useNavigation<HomeNavigation>();

  return (
    <Screen
      title="Home"
      subtitle={`Welcome, ${user?.fullName ?? 'team member'}`}
    >
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Active project</Text>
        <Text style={styles.cardValue}>
          {selectedProject
            ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
            : 'No project selected'}
        </Text>
        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate('ProjectSelect')}
        >
          <Text style={styles.linkText}>Change project</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Text style={styles.statLabel}>Network</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Pending sync</Text>
        </View>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate('DailyProgressReport')}
      >
        <Text style={styles.primaryButtonText}>Daily progress report</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('GoodsReceipt')}
      >
        <Text style={styles.secondaryButtonText}>Record goods receipt</Text>
      </Pressable>

      <Text style={styles.note}>
        GRN capture requires photos and GPS, then queues offline for sync
        (media first, then submit).
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#F4F0E6',
    fontWeight: '700',
    fontSize: 15,
  },
});
