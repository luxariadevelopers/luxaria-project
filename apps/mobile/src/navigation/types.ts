import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Projects: undefined;
  PendingSync: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ProjectSelect: undefined;
  GoodsReceipt: { purchaseOrderId?: string } | undefined;
  DailyProgressReport: undefined;
  WorkMeasurementList: undefined;
  WorkMeasurementForm: undefined;
  StockCountList: undefined;
  StockCountEntry: { countId?: string } | undefined;
  MaterialIssue: undefined;
  MaterialReturn: { issueId?: string } | undefined;
  NewLabourVoucher: undefined;
  LabourVoucherHistory: undefined;
  LabourVoucherDetail: { voucherId: string };
  Notifications: undefined;
  NotificationPreferences: undefined;
  ConflictDetail: { transactionId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
