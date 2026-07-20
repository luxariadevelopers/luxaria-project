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
  Tabs: undefined;
  ProjectSelect: undefined;
  GoodsReceipt: undefined;
  DailyProgressReport: undefined;
  LabourVoucherHistory: undefined;
  NewLabourVoucher: undefined;
  LabourVoucherDetail: { voucherId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
