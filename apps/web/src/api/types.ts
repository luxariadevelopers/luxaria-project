export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorBody = {
  success?: false;
  message?: string;
  error?: string;
  statusCode?: number;
};

export type AuthUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  status: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: string;
};

export type UserAccess = {
  userId: string;
  roleIds: string[];
  roleCodes: string[];
  permissions: string[];
  bypassPermissions: boolean;
};

export type ProjectOption = {
  id: string;
  projectCode: string;
  projectName: string;
  status?: string;
};
