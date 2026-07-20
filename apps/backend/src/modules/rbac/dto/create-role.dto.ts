import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Custom Ops Lead' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'CUSTOM_OPS_LEAD',
    description: 'Uppercase code; auto-generated as ROL-###### if omitted',
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

  @ApiPropertyOptional({ type: [String], example: ['project.view', 'expense.create'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Only Super Admin should use bypass; custom roles default false',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  bypassPermissions?: boolean;
}
