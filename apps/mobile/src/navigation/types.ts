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
  ProjectDashboard: undefined;
  GoodsReceipt: { purchaseOrderId?: string } | undefined;
  DailyProgressReport: undefined;
  DprList: undefined;
  DprDetail: { dprId: string };
  WorkMeasurementList: undefined;
  WorkMeasurementForm: undefined;
  WorkOrderList: undefined;
  StockCountList: undefined;
  StockCountEntry: { countId?: string } | undefined;
  MaterialIssue: undefined;
  MaterialIssueForm: undefined;
  MaterialReturn: { issueId?: string } | undefined;
  NewLabourVoucher: undefined;
  LabourVoucherHistory: undefined;
  LabourVoucherDetail: { voucherId: string };
  LabourAttendanceList: undefined;
  LabourAttendanceForm: undefined;
  LabourAttendanceDetail: { attendanceId: string };
  SiteExpenseList: undefined;
  SiteExpenseForm: undefined;
  SiteExpenseDetail: { expenseId: string };
  ApprovalsList: undefined;
  ApprovalDetail: { approvalId: string };
  PettyCashList: undefined;
  PettyCashForm: undefined;
  PettyCashDetail: { requestId: string };
  PurchaseRequestList: undefined;
  PurchaseRequestForm: undefined;
  PurchaseRequestDetail: { requestId: string };
  StockLedger: undefined;
  QualityInspectionList: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  ConflictDetail: { transactionId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
