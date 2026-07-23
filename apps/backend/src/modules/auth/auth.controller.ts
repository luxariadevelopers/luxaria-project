import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  clearRefreshTokenCookie,
  readRefreshTokenFromRequest,
  setRefreshTokenCookie,
  type AuthCookieConfig,
} from '../../common/security/auth-cookies';
import { REFRESH_TOKEN_COOKIE } from '../../common/security/security.constants';
import type { AppConfig } from '../../config/configuration';
import { parseDurationToMs } from '../../common/utils/duration.util';
import { AuthService } from './auth.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import type { AuthUser } from './types/auth-user.type';

@GlobalScope()
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('bootstrap-admin')
  @ApiOperation({
    summary: 'Create the first admin user (only when users collection is empty)',
  })
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login with email or mobile + password' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, request);
    const data = result.data as {
      refreshToken: string;
      accessToken: string;
    };
    this.writeRefreshCookie(res, data.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @ApiOperation({
    summary:
      'Rotate refresh token and issue new access token (body or httpOnly cookie)',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenFromRequest({
      bodyToken: dto.refreshToken,
      cookieToken: request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined,
    });
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.authService.refresh(refreshToken, request);
    const data = result.data as { refreshToken: string };
    this.writeRefreshCookie(res, data.refreshToken);
    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout current device session' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenFromRequest({
      bodyToken: dto.refreshToken,
      cookieToken: request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined,
    });
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearRefreshCookie(res);
    return this.authService.logoutResponse();
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(user.id);
    this.clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(dto, request);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({
    summary:
      'Change password (required when mustChangePassword is true after admin set a temporary password)',
  })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.newPassword,
      dto.currentPassword,
    );
  }

  private cookieConfig(): AuthCookieConfig {
    const refreshExpiresIn = this.configService.getOrThrow<
      AppConfig['jwtRefreshExpiresIn']
    >('jwtRefreshExpiresIn');
    return {
      secure: this.configService.getOrThrow<AppConfig['authCookieSecure']>(
        'authCookieSecure',
      ),
      sameSite: this.configService.getOrThrow<AppConfig['authCookieSameSite']>(
        'authCookieSameSite',
      ),
      maxAgeMs: parseDurationToMs(refreshExpiresIn, 7 * 86_400_000),
      domain: this.configService.getOrThrow<AppConfig['authCookieDomain']>(
        'authCookieDomain',
      ),
    };
  }

  private writeRefreshCookie(res: Response, refreshToken: string) {
    setRefreshTokenCookie(res, refreshToken, this.cookieConfig());
  }

  private clearRefreshCookie(res: Response) {
    clearRefreshTokenCookie(res, this.cookieConfig());
  }
}
