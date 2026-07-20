export type AuthUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  status: string;
};

export type JwtPayload = {
  sub: string;
  userCode: string;
  email: string | null;
  mobile: string | null;
};
