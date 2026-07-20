import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Opaque refresh token. Optional when sent via httpOnly cookie luxaria_refresh_token.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
