import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ReportingApprovalMode,
  UserStatus,
} from '../schemas/user.schema';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateUserDto) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePhoto?: string | null;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportingManager?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  reportingOfficers?: string[];

  @ApiPropertyOptional({ enum: ReportingApprovalMode })
  @IsOptional()
  @IsEnum(ReportingApprovalMode)
  reportingApprovalMode?: ReportingApprovalMode;

  @ApiPropertyOptional({
    description:
      'Set a temporary password (forces change on next login). Requires user.reset_password.',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;
}
