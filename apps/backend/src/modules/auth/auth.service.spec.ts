import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../users/schemas/user.schema';
import { AuthService } from './auth.service';

describe('AuthService account rules', () => {
  const buildService = () =>
    Object.create(AuthService.prototype) as AuthService & {
      assertUserCanAuthenticate: (status: UserStatus, lockUntil: Date | null) => void;
    };

  it('blocks inactive users', () => {
    const service = buildService();
    expect(() =>
      service.assertUserCanAuthenticate(UserStatus.Inactive, null),
    ).toThrow(ForbiddenException);
  });

  it('blocks locked users while lock is active', () => {
    const service = buildService();
    expect(() =>
      service.assertUserCanAuthenticate(
        UserStatus.Locked,
        new Date(Date.now() + 60_000),
      ),
    ).toThrow(ForbiddenException);
  });
});

describe('AuthService credential failures', () => {
  it('maps missing user to unauthorized', async () => {
    const usersService = {
      findByEmailOrMobileWithPassword: jest.fn().mockResolvedValue(null),
      recordFailedLogin: jest.fn(),
    };

    const auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const employeeModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      }),
    };

    const service = new AuthService(
      usersService as never,
      {} as never,
      {} as never,
      {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'authMaxFailedAttempts') return 5;
          if (key === 'authLockMinutes') return 30;
          return 'test';
        }),
      } as never,
      {} as never,
      {} as never,
      auditLogService as never,
      {} as never,
      employeeModel as never,
    );

    await expect(
      service.login(
        { identifier: 'nobody@luxaria.dev', password: 'ChangeMe123!' },
        { headers: {}, ip: '127.0.0.1' } as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
