import { Types } from 'mongoose';
import { UserStatus } from './schemas/user.schema';
import { toPublicUser } from './users.mapper';

describe('toPublicUser', () => {
  it('maps user fields and never exposes passwordHash', () => {
    const publicUser = toPublicUser({
      _id: new Types.ObjectId(),
      userCode: 'USR-000001',
      fullName: 'Site Engineer',
      email: 'engineer@luxaria.dev',
      mobile: '9876543210',
      employeeId: 'E-101',
      designation: 'Site Engineer',
      department: 'Projects',
      profilePhoto: null,
      status: UserStatus.Active,
      assignedProjects: [new Types.ObjectId()],
      roleIds: [new Types.ObjectId()],
      reportingManager: new Types.ObjectId(),
      joiningDate: new Date('2026-01-15T00:00:00.000Z'),
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(publicUser.userCode).toBe('USR-000001');
    expect(publicUser.department).toBe('Projects');
    expect(publicUser.assignedProjects).toHaveLength(1);
    expect(publicUser.roleIds).toHaveLength(1);
    expect(publicUser).not.toHaveProperty('passwordHash');
  });
});
