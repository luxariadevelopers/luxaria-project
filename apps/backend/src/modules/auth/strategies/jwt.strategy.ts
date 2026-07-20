import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import type { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../../config/configuration';
import { Company } from '../../company/schemas/company.schema';
import { UserStatus } from '../../users/schemas/user.schema';
import { UsersService } from '../../users/users.service';
import type { AuthUser, JwtPayload } from '../types/auth-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<AppConfig['jwtAccessSecret']>('jwtAccessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === UserStatus.Inactive) {
      throw new UnauthorizedException('User is not authorized');
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Account is locked');
    }
    if (user.status === UserStatus.Locked) {
      throw new UnauthorizedException('Account is locked');
    }

    // Resolve company server-side — never from JWT claims.
    let companyId: string | null = user.companyId
      ? String(user.companyId)
      : null;
    if (!companyId) {
      const primary = await this.companyModel
        .findOne({ isPrimary: true })
        .select('_id')
        .lean()
        .exec();
      companyId = primary ? String(primary._id) : null;
    }

    return {
      id: String(user._id),
      userCode: user.userCode,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      companyId,
    };
  }
}
