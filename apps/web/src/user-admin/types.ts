export const UserStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Locked: 'locked',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export type PublicUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  employeeId: string | null;
  designation: string | null;
  department: string | null;
  profilePhoto: string | null;
  status: UserStatus | string;
  assignedProjects: string[];
  roleIds: string[];
  reportingManager: string | null;
  joiningDate: string | null;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedUsers = {
  items: PublicUser[];
  meta: AdminPaginationMeta;
};

export type ListUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: UserStatus;
  department?: string;
  projectId?: string;
  roleId?: string;
};

export type CreateUserInput = {
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  password: string;
  employeeId?: string | null;
  designation?: string | null;
  department?: string | null;
  profilePhoto?: string | null;
  status?: UserStatus;
  assignedProjects?: string[];
  roleIds?: string[];
  reportingManager?: string | null;
  joiningDate?: string | null;
};

export type UpdateUserInput = {
  fullName?: string;
  email?: string | null;
  mobile?: string | null;
  employeeId?: string | null;
  designation?: string | null;
  department?: string | null;
  profilePhoto?: string | null;
  reportingManager?: string | null;
  joiningDate?: string | null;
};
