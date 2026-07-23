import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import {
  ApprovalDetailScreen,
  ApprovalsListScreen,
} from '@/approvals';
import { useAuth } from '@/auth/AuthContext';
import { shouldForceChangePassword } from '@/auth/shouldForceChangePassword';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useProject } from '@/context/ProjectContext';
import { DprDetailScreen, DprListScreen } from '@/dpr';
import {
  LabourAttendanceDetailScreen,
  LabourAttendanceFormScreen,
  LabourAttendanceListScreen,
} from '@/labour-attendance';
import {
  LabourVoucherDetailScreen,
  LabourVoucherHistoryScreen,
  NewLabourVoucherScreen,
} from '@/labour-vouchers';
import {
  PettyCashDetailScreen,
  PettyCashFormScreen,
  PettyCashHomeScreen,
  PettyCashListScreen,
} from '@/petty-cash';
import {
  PettyCashTransferDetailScreen,
  PettyCashTransfersListScreen,
} from '@/petty-cash-transfers';
import {
  PurchaseRequestDetailScreen,
  PurchaseRequestFormScreen,
  PurchaseRequestListScreen,
} from '@/purchase-requests';
import { QualityInspectionListScreen } from '@/quality-inspections';
import { ConflictDetailScreen } from '@/screens/ConflictDetailScreen';
import { DailyProgressReportScreen } from '@/screens/DailyProgressReportScreen';
import { GoodsReceiptScreen } from '@/screens/GoodsReceiptScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ChangePasswordScreen } from '@/screens/ChangePasswordScreen';
import { ForceChangePasswordScreen } from '@/screens/ForceChangePasswordScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { MaterialIssueFormScreen } from '@/screens/MaterialIssueFormScreen';
import { MaterialIssueScreen } from '@/screens/MaterialIssueScreen';
import { MaterialReturnScreen } from '@/screens/MaterialReturnScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { NotificationPreferencesScreen } from '@/screens/NotificationPreferencesScreen';
import { PendingSyncScreen } from '@/screens/PendingSyncScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ExecutiveDashboardScreen } from '@/analytics/ExecutiveDashboardScreen';
import { DirectorCommandCentreScreen } from '@/director-command-centre';
import {
  DirectorDetailScreen,
  DirectorFormScreen,
  DirectorListScreen,
} from '@/directors';
import { FinanceDashboardScreen } from '@/finance-dashboard';
import {
  ChangeRequestsScreen,
  PostShareCapitalFormScreen,
  ShareholdingScreen,
} from '@/shareholding';
import {
  ContributionReceiptDetailScreen,
  ContributionReceiptFormScreen,
  ContributionReceiptListScreen,
} from '@/contribution-receipts';
import {
  JournalDetailScreen,
  JournalListScreen,
  ReverseJournalScreen,
} from '@/journals';
import {
  ProjectFinanceEntryScreen,
  ProjectFinanceListScreen,
  QuickCreateCostCentreScreen,
  QuickCreateExpenseAccountScreen,
} from '@/project-finance';
import { ProjectCapitalPlanScreen } from '@/projects';
import { ProjectDashboardScreen } from '@/screens/ProjectDashboardScreen';
import { ProjectSelectScreen } from '@/screens/ProjectSelectScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { StockCountEntryScreen } from '@/screens/StockCountEntryScreen';
import { StockCountListScreen } from '@/screens/StockCountListScreen';
import { WorkMeasurementFormScreen } from '@/screens/WorkMeasurementFormScreen';
import { WorkMeasurementListScreen } from '@/screens/WorkMeasurementListScreen';
import { WorkOrderListScreen } from '@/screens/WorkOrderListScreen';
import { LeadCaptureScreen } from '@/screens/LeadCaptureScreen';
import {
  SiteExpenseDetailScreen,
  SiteExpenseFormScreen,
  SiteExpenseListScreen,
} from '@/site-expenses';
import { StockLedgerScreen } from '@/stock-ledger';
import {
  UserDetailScreen,
  UserFormScreen,
  UsersListScreen,
} from '@/user-admin';
import { appNavigationRef } from '@/navigation/navigationRef';
import { colors } from '@/theme/colors';
import type {
  AppStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary : colors.textMuted,
      }}
    >
      {label}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Projects" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PendingSync"
        component={PendingSyncScreen}
        options={{
          title: 'Sync',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Sync" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function ForceChangePasswordNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen
        name="ForceChangePassword"
        component={ForceChangePasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { needsProjectSelection } = useProject();

  return (
    <AppStack.Navigator
      key={needsProjectSelection ? 'needs-project' : 'ready'}
      initialRouteName={needsProjectSelection ? 'ProjectSelect' : 'Tabs'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#F4F0E6',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <AppStack.Screen
        name="Tabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="ProjectSelect"
        component={ProjectSelectScreen}
        options={{
          title: 'Select project',
          presentation: needsProjectSelection ? 'card' : 'modal',
          headerBackVisible: !needsProjectSelection,
          gestureEnabled: !needsProjectSelection,
        }}
      />
      <AppStack.Screen
        name="ProjectDashboard"
        component={ProjectDashboardScreen}
        options={{ title: 'Project dashboard' }}
      />
      <AppStack.Screen
        name="ExecutiveDashboard"
        component={ExecutiveDashboardScreen}
        options={{ title: 'Executive' }}
      />
      <AppStack.Screen
        name="GoodsReceipt"
        component={GoodsReceiptScreen}
        options={{ title: 'Goods receipt' }}
      />
      <AppStack.Screen
        name="DprList"
        component={DprListScreen}
        options={{ title: 'Daily progress' }}
      />
      <AppStack.Screen
        name="DprDetail"
        component={DprDetailScreen}
        options={{ title: 'DPR detail' }}
      />
      <AppStack.Screen
        name="DailyProgressReport"
        component={DailyProgressReportScreen}
        options={{ title: 'Capture DPR' }}
      />
      <AppStack.Screen
        name="WorkMeasurementList"
        component={WorkMeasurementListScreen}
        options={{ title: 'Work measurement' }}
      />
      <AppStack.Screen
        name="WorkMeasurementForm"
        component={WorkMeasurementFormScreen}
        options={{ title: 'New measurement' }}
      />
      <AppStack.Screen
        name="WorkOrderList"
        component={WorkOrderListScreen}
        options={{ title: 'Work orders' }}
      />
      <AppStack.Screen
        name="StockCountList"
        component={StockCountListScreen}
        options={{ title: 'Stock count' }}
      />
      <AppStack.Screen
        name="StockCountEntry"
        component={StockCountEntryScreen}
        options={{ title: 'Count entry' }}
      />
      <AppStack.Screen
        name="MaterialIssue"
        component={MaterialIssueScreen}
        options={{ title: 'Material issue' }}
      />
      <AppStack.Screen
        name="MaterialIssueForm"
        component={MaterialIssueFormScreen}
        options={{ title: 'New material issue' }}
      />
      <AppStack.Screen
        name="MaterialReturn"
        component={MaterialReturnScreen}
        options={{ title: 'Material return' }}
      />
      <AppStack.Screen
        name="LabourVoucherHistory"
        component={LabourVoucherHistoryScreen}
        options={{ title: 'Labour vouchers' }}
      />
      <AppStack.Screen
        name="NewLabourVoucher"
        component={NewLabourVoucherScreen}
        options={{ title: 'New labour voucher' }}
      />
      <AppStack.Screen
        name="LabourVoucherDetail"
        component={LabourVoucherDetailScreen}
        options={{ title: 'Labour voucher' }}
      />
      <AppStack.Screen
        name="LabourAttendanceList"
        component={LabourAttendanceListScreen}
        options={{ title: 'Labour attendance' }}
      />
      <AppStack.Screen
        name="LabourAttendanceForm"
        component={LabourAttendanceFormScreen}
        options={{ title: 'New attendance' }}
      />
      <AppStack.Screen
        name="LabourAttendanceDetail"
        component={LabourAttendanceDetailScreen}
        options={{ title: 'Attendance' }}
      />
      <AppStack.Screen
        name="SiteExpenseList"
        component={SiteExpenseListScreen}
        options={{ title: 'Site expenses' }}
      />
      <AppStack.Screen
        name="SiteExpenseForm"
        component={SiteExpenseFormScreen}
        options={{ title: 'New site expense' }}
      />
      <AppStack.Screen
        name="SiteExpenseDetail"
        component={SiteExpenseDetailScreen}
        options={{ title: 'Site expense' }}
      />
      <AppStack.Screen
        name="ApprovalsList"
        component={ApprovalsListScreen}
        options={{ title: 'Approvals' }}
      />
      <AppStack.Screen
        name="ApprovalDetail"
        component={ApprovalDetailScreen}
        options={{ title: 'Approval' }}
      />
      <AppStack.Screen
        name="PettyCashList"
        component={PettyCashListScreen}
        options={{ title: 'Petty cash' }}
      />
      <AppStack.Screen
        name="PettyCashForm"
        component={PettyCashFormScreen}
        options={{ title: 'New petty cash' }}
      />
      <AppStack.Screen
        name="PettyCashDetail"
        component={PettyCashDetailScreen}
        options={{ title: 'Petty cash' }}
      />
      <AppStack.Screen
        name="PurchaseRequestList"
        component={PurchaseRequestListScreen}
        options={{ title: 'Purchase requests' }}
      />
      <AppStack.Screen
        name="PurchaseRequestForm"
        component={PurchaseRequestFormScreen}
        options={{ title: 'New purchase request' }}
      />
      <AppStack.Screen
        name="PurchaseRequestDetail"
        component={PurchaseRequestDetailScreen}
        options={{ title: 'Purchase request' }}
      />
      <AppStack.Screen
        name="StockLedger"
        component={StockLedgerScreen}
        options={{ title: 'Stock ledger' }}
      />
      <AppStack.Screen
        name="QualityInspectionList"
        component={QualityInspectionListScreen}
        options={{ title: 'Quality inspections' }}
      />
      <AppStack.Screen
        name="LeadCapture"
        component={LeadCaptureScreen}
        options={{ title: 'Capture lead' }}
      />
      <AppStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <AppStack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ title: 'Notification preferences' }}
      />
      <AppStack.Screen
        name="ConflictDetail"
        component={ConflictDetailScreen}
        options={{ title: 'Sync conflict' }}
      />
      <AppStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change password' }}
      />
      <AppStack.Screen
        name="FinanceDashboard"
        component={FinanceDashboardScreen}
        options={{ title: 'Finance' }}
      />
      <AppStack.Screen
        name="DirectorCommandCentre"
        component={DirectorCommandCentreScreen}
        options={{ title: 'Command centre' }}
      />
      <AppStack.Screen
        name="UsersList"
        component={UsersListScreen}
        options={{ title: 'Users' }}
      />
      <AppStack.Screen
        name="UserDetail"
        component={UserDetailScreen}
        options={{ title: 'User' }}
      />
      <AppStack.Screen
        name="UserForm"
        component={UserFormScreen}
        options={{ title: 'User form' }}
      />
      <AppStack.Screen
        name="DirectorsList"
        component={DirectorListScreen}
        options={{ title: 'Directors' }}
      />
      <AppStack.Screen
        name="DirectorDetail"
        component={DirectorDetailScreen}
        options={{ title: 'Director' }}
      />
      <AppStack.Screen
        name="DirectorForm"
        component={DirectorFormScreen}
        options={{ title: 'Director form' }}
      />
      <AppStack.Screen
        name="Shareholding"
        component={ShareholdingScreen}
        options={{ title: 'Shareholding' }}
      />
      <AppStack.Screen
        name="PostShareCapital"
        component={PostShareCapitalFormScreen}
        options={{ title: 'Post share capital' }}
      />
      <AppStack.Screen
        name="ShareholdingChangeRequests"
        component={ChangeRequestsScreen}
        options={{ title: 'Change requests' }}
      />
      <AppStack.Screen
        name="ContributionReceiptList"
        component={ContributionReceiptListScreen}
        options={{ title: 'Contribution receipts' }}
      />
      <AppStack.Screen
        name="ContributionReceiptDetail"
        component={ContributionReceiptDetailScreen}
        options={{ title: 'Contribution receipt' }}
      />
      <AppStack.Screen
        name="ContributionReceiptForm"
        component={ContributionReceiptFormScreen}
        options={{ title: 'New contribution receipt' }}
      />
      <AppStack.Screen
        name="ProjectCapitalPlan"
        component={ProjectCapitalPlanScreen}
        options={{ title: 'Capital plan' }}
      />
      <AppStack.Screen
        name="JournalList"
        component={JournalListScreen}
        options={{ title: 'Journals' }}
      />
      <AppStack.Screen
        name="JournalDetail"
        component={JournalDetailScreen}
        options={{ title: 'Journal' }}
      />
      <AppStack.Screen
        name="ReverseJournal"
        component={ReverseJournalScreen}
        options={{ title: 'Reverse journal' }}
      />
      <AppStack.Screen
        name="ProjectFinanceList"
        component={ProjectFinanceListScreen}
        options={{ title: 'Expense & income' }}
      />
      <AppStack.Screen
        name="ProjectFinanceEntry"
        component={ProjectFinanceEntryScreen}
        options={{ title: 'Project finance entry' }}
      />
      <AppStack.Screen
        name="QuickCreateExpenseAccount"
        component={QuickCreateExpenseAccountScreen}
        options={{ title: 'New expense account' }}
      />
      <AppStack.Screen
        name="QuickCreateCostCentre"
        component={QuickCreateCostCentreScreen}
        options={{ title: 'New cost centre' }}
      />
      <AppStack.Screen
        name="PettyCashHome"
        component={PettyCashHomeScreen}
        options={{ title: 'Petty cash' }}
      />
      <AppStack.Screen
        name="PettyCashTransfersList"
        component={PettyCashTransfersListScreen}
        options={{ title: 'Fund transfers' }}
      />
      <AppStack.Screen
        name="PettyCashTransferDetail"
        component={PettyCashTransferDetailScreen}
        options={{ title: 'Fund transfer' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen label="Starting Luxaria Site…" />;
  }

  const mustChangePassword = shouldForceChangePassword(
    isAuthenticated,
    user,
  );

  return (
    <NavigationContainer ref={appNavigationRef}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : mustChangePassword ? (
        <ForceChangePasswordNavigator />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}
