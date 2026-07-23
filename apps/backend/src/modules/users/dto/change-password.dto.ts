import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description:
      'Current password. Required for a normal change; optional when mustChangePassword is true (already authenticated with temporary password).',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @ApiProperty({ description: 'New permanent password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
