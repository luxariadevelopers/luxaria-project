export type AuthUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  status: string;
  /**
   * Authoritative company/tenant id resolved at authentication time
   * (user.companyId or primary company). Never taken from the client.
   */
  companyId: string | null;
};

export type JwtPayload = {
  sub: string;
  userCode: string;
  email: string | null;
  mobile: string | null;
};
