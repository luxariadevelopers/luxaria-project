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
  Notifications: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
