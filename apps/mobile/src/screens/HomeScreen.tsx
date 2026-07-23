import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resolveApprovalCapabilities } from '@/approvals';
import { useAuth } from '@/auth/AuthContext';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { resolveContributionReceiptCapabilities } from '@/contribution-receipts';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { useSite } from '@/context/SiteContext';
import { resolveDirectorCapabilities } from '@/directors';
import { resolveAttendanceCapabilities } from '@/labour-attendance';
import { LABOUR_VOUCHER_PERMISSIONS } from '@/labour-vouchers';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { resolvePettyCashCapabilities } from '@/petty-cash';
import { resolvePurchaseRequestCapabilities } from '@/purchase-requests';
import { resolveShareholdingCapabilities } from '@/shareholding';
import { resolveJournalCapabilities } from '@/journals';
import { resolveProjectFinanceCapabilities } from '@/project-finance';
import { resolveExpenseCapabilities } from '@/site-expenses';
import {
  canCreateSubmitStockCounts,
  canViewStockCounts,
} from '@/stock-count';
import { colors, hitSlopMin, radii, spacing, typography } from '@/theme';
import { resolveUserAdminCapabilities } from '@/user-admin';
import { resolveWorkMeasurementCapabilities } from '@/work-measurement/permissions';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

type ModuleItem = {
  id: string;
  label: string;
  section: string;
  onPress: () => void;
  keywords?: string;
};

export function HomeScreen() {
  const { user, hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { sites, selectedSite, setSelectedSiteId } = useSite();
  const { isOnline } = useNetwork();
  const { activeCount } = useOfflineSync();
  const navigation = useNavigation<HomeNavigation>();
  const [query, setQuery] = useState('');

  const modules = useMemo(() => {
    const workMeasurementCaps =
      resolveWorkMeasurementCapabilities(hasPermission);
    const canViewWorkOrders = hasPermission('work_order.view');
    const attendanceCaps = resolveAttendanceCapabilities(hasPermission);
    const expenseCaps = resolveExpenseCapabilities(hasPermission);
    const projectFinanceCaps = resolveProjectFinanceCapabilities(hasPermission);
    const journalCaps = resolveJournalCapabilities(hasPermission);
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
    const canCreateGrn = hasPermission('grn.create');
    const canViewStockLedger = hasPermission('stock.view');
    const canViewQuality =
      hasPermission('quality.view') || hasPermission('quality.inspect');
    const canCaptureLead = hasPermission('lead.manage');
    const canViewExecutive =
      hasPermission('analytics.dashboard.view') ||
      hasPermission('dashboard.view');
    const canViewFinance = hasPermission('dashboard.view');
    const canViewDirectorCommandCentre =
      hasPermission('dashboard.view') ||
      hasPermission('analytics.dashboard.view');
    const userAdminCaps = resolveUserAdminCapabilities(hasPermission);
    const directorCaps = resolveDirectorCapabilities(hasPermission);
    const shareholdingCaps = resolveShareholdingCapabilities(hasPermission);
    const contributionCaps =
      resolveContributionReceiptCapabilities(hasPermission);
    const canEditCapital =
      hasPermission('project.update') ||
      hasPermission('project_participant.create') ||
      hasPermission('project_participant.update');

    const items: ModuleItem[] = [];

    if (canViewExecutive) {
      items.push({
        id: 'executive',
        label: 'Executive summary',
        section: 'Overview',
        onPress: () => navigation.navigate('ExecutiveDashboard'),
        keywords: 'analytics dashboard',
      });
    }
    if (canCaptureLead) {
      items.push({
        id: 'lead',
        label: 'Capture sales lead',
        section: 'Sales',
        onPress: () => navigation.navigate('LeadCapture'),
        keywords: 'crm lead',
      });
    }
    if (canViewDpr) {
      items.push({
        id: 'dpr',
        label: 'Daily progress',
        section: 'Site ops',
        onPress: () => {
          if (hasPermission('dpr.view')) navigation.navigate('DprList');
          else navigation.navigate('DailyProgressReport');
        },
        keywords: 'dpr report',
      });
    }
    if (canCreateGrn) {
      items.push({
        id: 'grn',
        label: 'Record goods receipt',
        section: 'Supply chain',
        onPress: () => navigation.navigate('GoodsReceipt'),
        keywords: 'grn receiving',
      });
    }
    if (attendanceCaps.canView || attendanceCaps.canCreate) {
      items.push({
        id: 'attendance',
        label: 'Labour attendance',
        section: 'Site ops',
        onPress: () => {
          if (attendanceCaps.canView) navigation.navigate('LabourAttendanceList');
          else navigation.navigate('LabourAttendanceForm');
        },
      });
    }
    if (expenseCaps.canView || expenseCaps.canCreate) {
      items.push({
        id: 'site-expense',
        label: 'Site expenses',
        section: 'Site ops',
        onPress: () => {
          if (expenseCaps.canView) navigation.navigate('SiteExpenseList');
          else navigation.navigate('SiteExpenseForm');
        },
      });
    }
    if (approvalCaps.canView) {
      items.push({
        id: 'approvals',
        label: 'Approvals',
        section: 'Overview',
        onPress: () => navigation.navigate('ApprovalsList'),
      });
    }
    if (
      pettyCashCaps.canView ||
      pettyCashCaps.canRequest ||
      pettyCashCaps.canViewCash
    ) {
      items.push({
        id: 'petty-cash',
        label: 'Petty cash',
        section: 'Finance',
        onPress: () => {
          if (
            pettyCashCaps.canView ||
            pettyCashCaps.canViewCash ||
            pettyCashCaps.canFund
          ) {
            navigation.navigate('PettyCashHome');
          } else {
            navigation.navigate('PettyCashForm');
          }
        },
      });
    }
    if (purchaseCaps.canView || purchaseCaps.canRequest) {
      items.push({
        id: 'pr',
        label: 'Purchase requests',
        section: 'Supply chain',
        onPress: () => {
          if (purchaseCaps.canView) navigation.navigate('PurchaseRequestList');
          else navigation.navigate('PurchaseRequestForm');
        },
        keywords: 'pr purchase',
      });
    }
    if (workMeasurementCaps.canView || workMeasurementCaps.canCreate) {
      items.push({
        id: 'measurement',
        label: 'Work measurement',
        section: 'Site ops',
        onPress: () => {
          if (workMeasurementCaps.canView) {
            navigation.navigate('WorkMeasurementList');
          } else {
            navigation.navigate('WorkMeasurementForm');
          }
        },
      });
    }
    if (canViewWorkOrders) {
      items.push({
        id: 'work-orders',
        label: 'Work orders',
        section: 'Site ops',
        onPress: () => navigation.navigate('WorkOrderList'),
      });
    }
    if (canViewStockCount || canCreateStockCount) {
      items.push({
        id: 'stock-count',
        label: 'Stock count',
        section: 'Supply chain',
        onPress: () => {
          if (canViewStockCount) navigation.navigate('StockCountList');
          else navigation.navigate('StockCountEntry');
        },
        keywords: 'inventory count',
      });
    }
    if (canViewStockLedger) {
      items.push({
        id: 'stock-ledger',
        label: 'Stock ledger',
        section: 'Supply chain',
        onPress: () => navigation.navigate('StockLedger'),
      });
    }
    if (canViewMaterialIssue || canCreateMaterialIssue) {
      items.push({
        id: 'material-issue',
        label: 'Material issue',
        section: 'Supply chain',
        onPress: () => {
          if (canViewMaterialIssue) navigation.navigate('MaterialIssue');
          else navigation.navigate('MaterialIssueForm');
        },
      });
    }
    if (canViewQuality) {
      items.push({
        id: 'quality',
        label: 'Quality inspections',
        section: 'Site ops',
        onPress: () => navigation.navigate('QualityInspectionList'),
      });
    }
    if (canViewLabourVoucher || canCreateLabourVoucher) {
      items.push({
        id: 'labour-voucher',
        label: 'Labour voucher',
        section: 'Site ops',
        onPress: () => {
          if (canViewLabourVoucher) navigation.navigate('LabourVoucherHistory');
          else navigation.navigate('NewLabourVoucher');
        },
      });
    }
    if (canEditCapital) {
      items.push({
        id: 'capital-plan',
        label: 'Capital plan',
        section: 'Capital',
        onPress: () => navigation.navigate('ProjectCapitalPlan'),
      });
    }
    if (directorCaps.canView) {
      items.push({
        id: 'directors',
        label: 'Directors',
        section: 'Capital',
        onPress: () => navigation.navigate('DirectorsList'),
      });
    }
    if (shareholdingCaps.canView) {
      items.push({
        id: 'shareholding',
        label: 'Shareholding',
        section: 'Capital',
        onPress: () => navigation.navigate('Shareholding'),
      });
    }
    if (contributionCaps.canView || contributionCaps.canCreate) {
      items.push({
        id: 'contribution',
        label: 'Contribution receipts',
        section: 'Capital',
        onPress: () => {
          if (contributionCaps.canView) {
            navigation.navigate('ContributionReceiptList');
          } else {
            navigation.navigate('ContributionReceiptForm');
          }
        },
      });
    }
    if (projectFinanceCaps.canView) {
      items.push({
        id: 'project-finance',
        label: 'Project expense & income',
        section: 'Finance',
        onPress: () => navigation.navigate('ProjectFinanceList'),
      });
    }
    if (journalCaps.canView) {
      items.push({
        id: 'journals',
        label: 'Journals',
        section: 'Finance',
        onPress: () => navigation.navigate('JournalList'),
      });
    }
    if (canViewFinance) {
      items.push({
        id: 'finance-dash',
        label: 'Finance dashboard',
        section: 'Finance',
        onPress: () => navigation.navigate('FinanceDashboard'),
      });
    }
    if (canViewDirectorCommandCentre) {
      items.push({
        id: 'command-centre',
        label: 'Director command centre',
        section: 'Finance',
        onPress: () => navigation.navigate('DirectorCommandCentre'),
      });
    }
    if (userAdminCaps.canView || userAdminCaps.canCreate) {
      items.push({
        id: 'users',
        label: 'Users',
        section: 'Admin',
        onPress: () => {
          if (userAdminCaps.canView) navigation.navigate('UsersList');
          else navigation.navigate('UserForm', {});
        },
      });
    }

    return items;
  }, [hasPermission, navigation]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((item) => {
      const hay = `${item.label} ${item.section} ${item.keywords ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [modules, query]);

  const sections = useMemo(() => {
    const order = [
      'Overview',
      'Site ops',
      'Supply chain',
      'Sales',
      'Finance',
      'Capital',
      'Admin',
    ];
    const map = new Map<string, ModuleItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return order
      .filter((name) => map.has(name))
      .map((name) => ({ name, items: map.get(name)! }));
  }, [filtered]);

  const cycleSite = () => {
    if (sites.length < 2) return;
    const currentIndex = selectedSite
      ? sites.findIndex((s) => s.id === selectedSite.id)
      : -1;
    const next = sites[(currentIndex + 1) % sites.length];
    if (next) void setSelectedSiteId(next.id);
  };

  return (
    <Screen
      title="Home"
      subtitle={`Welcome, ${user?.fullName ?? 'team member'}`}
      scroll={false}
      showHeader
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.chipRow}>
          <Chip
            hint="Project"
            label={
              selectedProject
                ? `${selectedProject.projectCode}`
                : 'Select project'
            }
            onPress={() => navigation.navigate('ProjectSelect')}
            style={styles.chip}
          />
          {sites.length > 0 ? (
            <Chip
              hint="Site"
              label={
                selectedSite ? selectedSite.siteCode : 'Select site'
              }
              onPress={sites.length > 1 ? cycleSite : undefined}
              style={styles.chip}
            />
          ) : null}
        </View>

        {selectedProject ? (
          <Text style={styles.projectName} numberOfLines={2}>
            {selectedProject.projectName}
            {selectedSite ? ` · ${selectedSite.siteName}` : ''}
          </Text>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statLabel}>Network</Text>
          </View>
          <Pressable
            style={styles.stat}
            onPress={() => navigation.navigate('PendingSync')}
          >
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Pending sync</Text>
          </Pressable>
        </View>

        <TextField
          label="Search modules"
          value={query}
          onChangeText={setQuery}
          placeholder="DPR, approvals, stock…"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          containerStyle={styles.search}
        />

        {sections.length === 0 ? (
          <Text style={styles.empty}>
            No modules match your search or permissions.
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.name} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.name}</Text>
              {section.items.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.moduleRow,
                    pressed && styles.modulePressed,
                  ]}
                >
                  <Text style={styles.moduleLabel}>{item.label}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          ))
        )}

        <Text style={styles.note}>
          Site capture flows keep the selected project context and queue
          supported records for offline sync where available.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '40%',
  },
  projectName: {
    ...typography.meta,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    minHeight: hitSlopMin,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  statValue: {
    ...typography.title,
    fontSize: 18,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.meta,
  },
  search: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  moduleRow: {
    minHeight: hitSlopMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  modulePressed: {
    opacity: 0.88,
    backgroundColor: '#F8F5EE',
  },
  moduleLabel: {
    ...typography.bodyStrong,
    flex: 1,
  },
  chevron: {
    color: colors.secondary,
    fontSize: 22,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  empty: {
    ...typography.meta,
    marginVertical: spacing.xl,
    textAlign: 'center',
  },
  note: {
    ...typography.meta,
    lineHeight: 21,
    marginTop: spacing.md,
  },
});
