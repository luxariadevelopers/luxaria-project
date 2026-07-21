import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resolveApprovalCapabilities } from '@/approvals';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { resolveAttendanceCapabilities } from '@/labour-attendance';
import { LABOUR_VOUCHER_PERMISSIONS } from '@/labour-vouchers';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { resolvePettyCashCapabilities } from '@/petty-cash';
import { resolvePurchaseRequestCapabilities } from '@/purchase-requests';
import { resolveExpenseCapabilities } from '@/site-expenses';
import {
  canCreateSubmitStockCounts,
  canViewStockCounts,
} from '@/stock-count';
import { colors } from '@/theme/colors';
import { resolveWorkMeasurementCapabilities } from '@/work-measurement/permissions';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function HomeScreen() {
  const { user, hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { activeCount } = useOfflineSync();
  const navigation = useNavigation<HomeNavigation>();

  const workMeasurementCaps =
    resolveWorkMeasurementCapabilities(hasPermission);
  const attendanceCaps = resolveAttendanceCapabilities(hasPermission);
  const expenseCaps = resolveExpenseCapabilities(hasPermission);
  const approvalCaps = resolveApprovalCapabilities(hasPermission);
  const pettyCashCaps = resolvePettyCashCapabilities(hasPermission);
  const purchaseCaps = resolvePurchaseRequestCapabilities(hasPermission);
  const canViewStockCount = canViewStockCounts(hasPermission);
  const canCreateStockCount = canCreateSubmitStockCounts(hasPermission);
  const canViewMaterialIssue = hasPermission('stock.view');
  const canCreateMaterialIssue = hasPermission('stock.issue');
  const canViewLabourVoucher = hasPermission(LABOUR_VOUCHER_PERMISSIONS.view);
  const canCreateLabourVoucher = hasPermission(
    LABOUR_VOUCHER_PERMISSIONS.createOrSubmit,
  );
  const canViewDpr = hasPermission('dpr.view') || hasPermission('dpr.create');
  const canViewStockLedger = hasPermission('stock.view');
  const canViewQuality =
    hasPermission('quality.view') || hasPermission('quality.inspect');

  return (
    <Screen
      title="Home"
      subtitle={`Welcome, ${user?.fullName ?? 'team member'}`}
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
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
            <Text style={styles.statValue}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Network</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Pending sync</Text>
          </View>
        </View>

        {canViewDpr ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              if (hasPermission('dpr.view')) {
                navigation.navigate('DprList');
              } else {
                navigation.navigate('DailyProgressReport');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Daily progress</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('GoodsReceipt')}
        >
          <Text style={styles.secondaryButtonText}>Record goods receipt</Text>
        </Pressable>

        {attendanceCaps.canView || attendanceCaps.canCreate ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (attendanceCaps.canView) {
                navigation.navigate('LabourAttendanceList');
              } else {
                navigation.navigate('LabourAttendanceForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Labour attendance</Text>
          </Pressable>
        ) : null}

        {expenseCaps.canView || expenseCaps.canCreate ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (expenseCaps.canView) {
                navigation.navigate('SiteExpenseList');
              } else {
                navigation.navigate('SiteExpenseForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Site expenses</Text>
          </Pressable>
        ) : null}

        {approvalCaps.canView ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ApprovalsList')}
          >
            <Text style={styles.secondaryButtonText}>Approvals</Text>
          </Pressable>
        ) : null}

        {pettyCashCaps.canView || pettyCashCaps.canRequest ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (pettyCashCaps.canView) {
                navigation.navigate('PettyCashList');
              } else {
                navigation.navigate('PettyCashForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Petty cash</Text>
          </Pressable>
        ) : null}

        {purchaseCaps.canView || purchaseCaps.canRequest ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (purchaseCaps.canView) {
                navigation.navigate('PurchaseRequestList');
              } else {
                navigation.navigate('PurchaseRequestForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Purchase requests</Text>
          </Pressable>
        ) : null}

        {workMeasurementCaps.canView || workMeasurementCaps.canCreate ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (workMeasurementCaps.canView) {
                navigation.navigate('WorkMeasurementList');
              } else {
                navigation.navigate('WorkMeasurementForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Work measurement</Text>
          </Pressable>
        ) : null}

        {canViewStockCount || canCreateStockCount ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (canViewStockCount) {
                navigation.navigate('StockCountList');
              } else {
                navigation.navigate('StockCountEntry');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Stock count</Text>
          </Pressable>
        ) : null}

        {canViewStockLedger ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('StockLedger')}
          >
            <Text style={styles.secondaryButtonText}>Stock ledger</Text>
          </Pressable>
        ) : null}

        {canViewMaterialIssue || canCreateMaterialIssue ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (canViewMaterialIssue) {
                navigation.navigate('MaterialIssue');
              } else {
                navigation.navigate('MaterialIssueForm');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Material issue</Text>
          </Pressable>
        ) : null}

        {canViewQuality ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('QualityInspectionList')}
          >
            <Text style={styles.secondaryButtonText}>Quality inspections</Text>
          </Pressable>
        ) : null}

        {canViewLabourVoucher || canCreateLabourVoucher ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              if (canViewLabourVoucher) {
                navigation.navigate('LabourVoucherHistory');
              } else {
                navigation.navigate('NewLabourVoucher');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Labour voucher</Text>
          </Pressable>
        ) : null}

        <Text style={styles.note}>
          Site capture flows keep the selected project context and queue
          supported records for offline sync where available.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
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
  linkButton: { alignSelf: 'flex-start' },
  linkText: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
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
  statLabel: { color: colors.textMuted, fontSize: 13 },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
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
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
  primaryButtonText: { color: '#F4F0E6', fontWeight: '700', fontSize: 15 },
});
