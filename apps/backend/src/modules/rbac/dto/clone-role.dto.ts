import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CloneRoleDto {
  @ApiProperty({ example: 'Project Manager Copy' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({
    example: 'PROJECT_MANAGER_COPY',
    description: 'Auto-generated if omitted',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, {
    message: 'code must be uppercase alphanumeric/underscore',
  })
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}
