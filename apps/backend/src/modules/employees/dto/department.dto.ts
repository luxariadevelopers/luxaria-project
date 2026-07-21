import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'ENGINEERING' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  headUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  headUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}
