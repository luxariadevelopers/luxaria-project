import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { hashPassword, verifyPassword } from '../../common/utils/crypto.util';
import { parseDurationToMs } from '../../common/utils/duration.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import {
  Employee,
  EMPLOYEE_LOGIN_ALLOWED_STATUSES,
} from '../employees/schemas/employee.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { SUPER_ADMIN_ROLE_CODE } from '../rbac/permissions.catalog';
import { RolesService } from '../rbac/roles.service';
import type { DeviceContext } from '../sessions/session.service';
import { SessionService } from '../sessions/session.service';
import { User, UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthUser, JwtPayload } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly numberingService: NumberingService,
    private readonly rolesService: RolesService,
    private readonly auditLogService: AuditLogService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<Employee>,
  ) {}

  /**
   * One-time bootstrap when no users exist yet.
   * Assigns the seeded Super Admin role (bypass permissions).
   */
  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const existingCount = await this.userModel
      .countDocuments()
      .setOptions({ withDeleted: true });
    if (existingCount > 0) {
      throw new ConflictException('Bootstrap is only allowed when no users exist');
    }

    const superAdminRole = await this.rolesService.findByCode(SUPER_ADMIN_ROLE_CODE);
    if (!superAdminRole) {
      throw new ConflictException(
        'Super Admin role is not seeded yet; restart the API and try again',
      );
    }

    const userCode = await this.numberingService.nextCode(NumberEntityType.USER);
    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.createUser({
      userCode,
      fullName: dto.fullName,
      email: dto.email,
      mobile: dto.mobile ?? null,
      passwordHash,
      status: UserStatus.Active,
      roleIds: [superAdminRole._id],
    });

    return createSuccessResponse(
      this.toPublicUser(user),
      'Bootstrap admin created successfully',
    );
  }

  async login(dto: LoginDto, request: Request) {
    const user = await this.usersService.findByEmailOrMobileWithPassword(dto.identifier);

    if (!user) {
      await this.auditAuth(null, AuditAction.LOGIN, 'auth_login_failed', null, {
        reason: 'unknown_user',
        identifier: dto.identifier,
      }, request);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertUserCanAuthenticate(user.status, user.lockUntil);
    await this.assertEmployeeCanAuthenticate(String(user._id));

    const passwordOk = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      await this.usersService.recordFailedLogin(
        user._id,
        this.configService.getOrThrow<AppConfig['authMaxFailedAttempts']>(
          'authMaxFailedAttempts',
        ),
        this.configService.getOrThrow<AppConfig['authLockMinutes']>('authLockMinutes'),
      );
      await this.auditAuth(
        String(user._id),
        AuditAction.LOGIN,
        'auth_login_failed',
        String(user._id),
        {
          reason: 'bad_password',
          mustChangePassword: Boolean(user.mustChangePassword),
        },
        request,
      );
      // Only hint about a temp password when one is active for this account.
      if (user.mustChangePassword) {
        throw new UnauthorizedException(
          'A temporary password was set for this account. Sign in with that password — not your old one.',
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.recordSuccessfulLogin(user._id);

    const tokens = await this.issueTokenPair(user._id, {
      userCode: user.userCode,
      email: user.email,
      mobile: user.mobile,
    }, this.extractDeviceContext(request, dto.deviceName));

    await this.auditAuth(
      String(user._id),
      AuditAction.LOGIN,
      'auth_login',
      String(user._id),
      { userCode: user.userCode },
      request,
    );

    return createSuccessResponse(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.configService.getOrThrow<AppConfig['jwtAccessExpiresIn']>(
          'jwtAccessExpiresIn',
        ),
        user: this.toPublicUser(user),
      },
      'Login successful',
    );
  }

  async refresh(refreshToken: string, request: Request) {
    const session = await this.sessionService.findActiveRefreshSession(refreshToken);

    if (!session) {
      const reused = await this.detectReuseAndRevoke(refreshToken);
      if (reused) {
        await this.auditAuth(
          null,
          AuditAction.UPDATE,
          'auth_refresh_reuse',
          null,
          { revokedFamily: true },
          request,
        );
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.assertUserCanAuthenticate(user.status, user.lockUntil);
    await this.assertEmployeeCanAuthenticate(String(user._id));

    const refreshExpiresIn = this.configService.getOrThrow<AppConfig['jwtRefreshExpiresIn']>(
      'jwtRefreshExpiresIn',
    );
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(refreshExpiresIn, 7 * 86_400_000),
    );

    const rotated = await this.sessionService.rotateRefreshSession(
      session,
      expiresAt,
      this.extractDeviceContext(request, session.deviceName ?? undefined),
    );

    const accessToken = await this.signAccessToken({
      sub: String(user._id),
      userCode: user.userCode,
      email: user.email,
      mobile: user.mobile,
    });

    return createSuccessResponse(
      {
        accessToken,
        refreshToken: rotated.refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.configService.getOrThrow<AppConfig['jwtAccessExpiresIn']>(
          'jwtAccessExpiresIn',
        ),
      },
      'Token refreshed successfully',
    );
  }

  async logout(refreshToken: string) {
    await this.sessionService.revokeRefreshToken(refreshToken);
    return this.logoutResponse();
  }

  logoutResponse() {
    return createSuccessResponse(null, 'Logged out successfully');
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeAllForUser(userId);
    await this.auditLogService.record({
      userId,
      action: AuditAction.LOGOUT,
      module: 'auth',
      entityType: 'auth_logout_all',
      entityId: userId,
      afterData: { allDevices: true },
    });
    return createSuccessResponse(null, 'Logged out from all devices');
  }

  async forgotPassword(dto: ForgotPasswordDto, request: Request) {
    const user = await this.usersService.findByEmailOrMobile(dto.identifier);
    const meta: Record<string, unknown> = {};

    if (user && user.status !== UserStatus.Inactive) {
      const expiresAt = new Date(Date.now() + 60 * 60_000);
      const { token } = await this.sessionService.createPasswordResetToken(
        user._id,
        expiresAt,
        this.extractDeviceContext(request),
      );

      // Email/SMS delivery is a later phase. In non-production, return token for testing.
      if (this.configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv') !== 'production') {
        meta.resetToken = token;
      }
    }

    return createSuccessResponse(
      null,
      'If an account exists for that identifier, password reset instructions were issued',
      meta,
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.sessionService.findValidPasswordResetToken(dto.token);
    if (!reset) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.usersService.updatePassword(reset.userId, passwordHash);
    await this.sessionService.markPasswordResetUsed(reset._id);
    await this.sessionService.revokeAllForUser(reset.userId);

    return createSuccessResponse(null, 'Password reset successful');
  }

  async me(user: AuthUser) {
    const fresh = await this.usersService.findById(user.id);
    if (!fresh) {
      return createSuccessResponse(user, 'Current user retrieved');
    }
    return createSuccessResponse(
      this.toPublicUser(fresh),
      'Current user retrieved',
    );
  }

  private async issueTokenPair(
    userId: { toString(): string },
    profile: { userCode: string; email: string | null; mobile: string | null },
    device: DeviceContext,
  ) {
    const accessToken = await this.signAccessToken({
      sub: String(userId),
      userCode: profile.userCode,
      email: profile.email,
      mobile: profile.mobile,
    });

    const refreshExpiresIn = this.configService.getOrThrow<AppConfig['jwtRefreshExpiresIn']>(
      'jwtRefreshExpiresIn',
    );
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(refreshExpiresIn, 7 * 86_400_000),
    );

    const session = await this.sessionService.createRefreshSession(
      String(userId),
      expiresAt,
      device,
    );

    return {
      accessToken,
      refreshToken: session.refreshToken,
    };
  }

  private signAccessToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<AppConfig['jwtAccessSecret']>('jwtAccessSecret'),
      expiresIn: this.configService.getOrThrow<AppConfig['jwtAccessExpiresIn']>(
        'jwtAccessExpiresIn',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  /** @internal exposed for unit tests */
  assertUserCanAuthenticate(status: UserStatus, lockUntil: Date | null) {
    if (status === UserStatus.Inactive) {
      throw new ForbiddenException('Account is inactive');
    }

    if (status === UserStatus.Locked || (lockUntil && lockUntil.getTime() > Date.now())) {
      throw new ForbiddenException('Account is locked due to repeated failed logins');
    }
  }

  /**
   * When a User is linked to an Employee, deny login unless employee status
   * is active, on_leave, or invited. Draft/suspended/relieved/terminated/archived
   * cannot authenticate. Users without an employee record are unaffected.
   */
  async assertEmployeeCanAuthenticate(userId: string): Promise<void> {
    const employee = await this.employeeModel
      .findOne({ userId })
      .select('status')
      .lean()
      .exec();
    if (!employee) {
      return;
    }
    if (!EMPLOYEE_LOGIN_ALLOWED_STATUSES.includes(employee.status)) {
      throw new ForbiddenException('Employee account is not active');
    }
  }

  private extractDeviceContext(request: Request, deviceName?: string | null): DeviceContext {
    const forwarded = request.headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];

    return {
      ipAddress: ipFromHeader?.trim() || request.ip || null,
      userAgent: request.headers['user-agent'] ?? null,
      deviceName: deviceName ?? null,
    };
  }

  private toPublicUser(user: {
    _id: { toString(): string };
    userCode: string;
    fullName: string;
    email: string | null;
    mobile: string | null;
    status: string;
    companyId?: { toString(): string } | null;
    mustChangePassword?: boolean;
  }): AuthUser {
    return {
      id: String(user._id),
      userCode: user.userCode,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      companyId: user.companyId ? String(user.companyId) : null,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
  }

  async changePassword(
    userId: string,
    newPassword: string,
    currentPassword?: string,
  ) {
    return this.usersService.changeOwnPassword(
      userId,
      newPassword,
      currentPassword,
    );
  }

  private async detectReuseAndRevoke(refreshToken: string): Promise<boolean> {
    const existing = await this.sessionService.findRefreshSessionByToken(refreshToken);
    if (!existing || !existing.revokedAt) {
      return false;
    }

    await this.sessionService.revokeFamily(existing.familyId);
    return true;
  }

  private async auditAuth(
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    afterData: Record<string, unknown>,
    request?: Request,
  ) {
    await this.auditLogService.record({
      userId,
      action,
      module: 'auth',
      entityType,
      entityId,
      afterData,
      request: request ?? null,
    });
  }
}
