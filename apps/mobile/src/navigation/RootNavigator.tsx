import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useProject } from '@/context/ProjectContext';
import {
  LabourVoucherDetailScreen,
  LabourVoucherHistoryScreen,
  NewLabourVoucherScreen,
} from '@/labour-vouchers';
import { ConflictDetailScreen } from '@/screens/ConflictDetailScreen';
import { DailyProgressReportScreen } from '@/screens/DailyProgressReportScreen';
import { GoodsReceiptScreen } from '@/screens/GoodsReceiptScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { MaterialIssueScreen } from '@/screens/MaterialIssueScreen';
import { MaterialReturnScreen } from '@/screens/MaterialReturnScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { NotificationPreferencesScreen } from '@/screens/NotificationPreferencesScreen';
import { PendingSyncScreen } from '@/screens/PendingSyncScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ProjectSelectScreen } from '@/screens/ProjectSelectScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { StockCountEntryScreen } from '@/screens/StockCountEntryScreen';
import { StockCountListScreen } from '@/screens/StockCountListScreen';
import { WorkMeasurementFormScreen } from '@/screens/WorkMeasurementFormScreen';
import { WorkMeasurementListScreen } from '@/screens/WorkMeasurementListScreen';
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
        name="GoodsReceipt"
        component={GoodsReceiptScreen}
        options={{ title: 'Goods receipt' }}
      />
      <AppStack.Screen
        name="DailyProgressReport"
        component={DailyProgressReportScreen}
        options={{ title: 'Daily Progress Report' }}
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
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen label="Starting Luxaria Site…" />;
  }

  return (
    <NavigationContainer ref={appNavigationRef}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
