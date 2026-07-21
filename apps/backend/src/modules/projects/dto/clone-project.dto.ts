import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloneProjectDto {
  @ApiProperty({ example: 'Luxaria Heights Phase 2' })
  @IsString()
  @IsNotEmpty()
  projectName!: string;

  @ApiPropertyOptional({
    description: 'Copy module settings embed (default true)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  copySettings?: boolean;

  @ApiPropertyOptional({
    description: 'Copy financialConfig embed (default true)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  copyFinancialConfig?: boolean;

  @ApiPropertyOptional({
    description: 'Clone site structure hierarchy into the new project',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  copyStructure?: boolean;
}
