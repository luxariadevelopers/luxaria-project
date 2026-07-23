import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  ForceChangePassword: undefined;
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
  ExecutiveDashboard: undefined;
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
  SiteExpenseForm: { draftId?: string } | undefined;
  SiteExpenseDetail: { expenseId: string };
  ApprovalsList: undefined;
  ApprovalDetail: { approvalId: string };
  PettyCashList: undefined;
  PettyCashForm: undefined;
  PettyCashDetail: { requestId: string };
  PettyCashHome: undefined;
  PettyCashTransfersList: undefined;
  PettyCashTransferDetail: { transferId: string };
  PurchaseRequestList: undefined;
  PurchaseRequestForm: undefined;
  PurchaseRequestDetail: { requestId: string };
  StockLedger: undefined;
  QualityInspectionList: undefined;
  LeadCapture: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  ConflictDetail: { transactionId: string };
  ChangePassword: undefined;
  FinanceDashboard: undefined;
  DirectorCommandCentre: undefined;
  UsersList: undefined;
  UserDetail: { userId: string };
  UserForm: { userId?: string } | undefined;
  DirectorsList: undefined;
  DirectorDetail: { directorId: string };
  DirectorForm: { directorId?: string } | undefined;
  Shareholding: undefined;
  PostShareCapital: undefined;
  ShareholdingChangeRequests: undefined;
  ContributionReceiptList: undefined;
  ContributionReceiptDetail: { receiptId: string };
  ContributionReceiptForm: undefined;
  ProjectCapitalPlan: undefined;
  JournalList: undefined;
  JournalDetail: { journalId: string };
  ReverseJournal: { journalId: string };
  ProjectFinanceList: undefined;
  ProjectFinanceEntry:
    | {
        kind?: 'income' | 'expense' | 'transfer';
        createdAccountId?: string;
        createdCostCentreId?: string;
      }
    | undefined;
  QuickCreateExpenseAccount: { returnKind: 'expense' };
  QuickCreateCostCentre: { returnKind: 'expense' };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
