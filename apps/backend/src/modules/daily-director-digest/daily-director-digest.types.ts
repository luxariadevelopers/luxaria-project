export type DigestMoney = {
  amount: number;
  count: number;
};

export type DigestProjectProgress = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  progressPercent: number;
};

export type DigestAlert = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  count: number;
};

export type DirectorDigestSummary = {
  userId: string;
  directorId: string | null;
  directorName: string;
  digestDate: string;
  generatedAt: string;
  projectCount: number;
  yesterdayProjectExpenses: DigestMoney;
  fundsReceived: DigestMoney;
  paymentsReleased: DigestMoney;
  currentBankBalance: number;
  currentCashBalance: number;
  labourAttendance: {
    sheetCount: number;
    workerCount: number;
  };
  materialReceipts: {
    grnCount: number;
    lineCount: number;
    receivedQuantity: number;
  };
  materialShortages: {
    count: number;
    items: Array<{
      id: string;
      projectId: string;
      message: string;
    }>;
  };
  projectProgress: DigestProjectProgress[];
  vendorPaymentsDue: DigestMoney;
  customerCollections: DigestMoney;
  pendingApprovals: {
    count: number;
  };
  criticalAlerts: DigestAlert[];
  summaryText: string;
};

export type DirectorDigestRecipient = {
  userId: string;
  fullName: string;
  email: string | null;
  directorId: string | null;
  roleCodes: string[];
};
