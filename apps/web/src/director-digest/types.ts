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

export type PreviewDigestQuery = {
  date?: string;
  userId?: string;
};

export type SendDigestInput = {
  date?: string;
  userIds?: string[];
  channels?: NotificationChannel[];
  force?: boolean;
};

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'whatsapp';

export type SendDigestResult = {
  digestDate: string;
  channels: NotificationChannel[];
  sentCount: number;
  failedCount: number;
  results: Array<{
    userId: string;
    directorName: string;
    status: 'sent' | 'failed' | 'skipped_already_sent';
    notificationId?: string;
    error?: string;
  }>;
};

export type PreviewAllDigestResult = {
  digestDate: string;
  digests: DirectorDigestSummary[];
};

export type RunDigestResult =
  | { mode: 'queued'; jobId: string }
  | { mode: 'inline'; jobId: string; result: SendDigestResult };
