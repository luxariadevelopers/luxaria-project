import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EmployeeStatus } from '../schemas/employee.schema';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty()
  @IsMongoId()
  departmentId!: string;

  @ApiProperty()
  @IsMongoId()
  designationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportingManagerUserId?: string | null;

  @ApiPropertyOptional({ example: 'full_time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryWorkLocation?: string | null;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportingManagerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  relievingDate?: string | null;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryWorkLocation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePhoto?: string | null;
}

export class ListEmployeesQueryDto {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}

export class ProvisionSiteEngineerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'ENGINEERING' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'SITE_ENGINEER' })
  @IsOptional()
  @IsString()
  designationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  reportingManagerUserId?: string | null;

  @ApiProperty({ default: true })
  @IsBoolean()
  createLogin!: boolean;

  @ApiPropertyOptional({ minLength: 8 })
  @ValidateIf((o: ProvisionSiteEngineerDto) => o.createLogin === true)
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inviteOnly?: boolean;

  @ApiPropertyOptional({ example: 'SITE_ENGINEER', default: 'SITE_ENGINEER' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  siteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  accessStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  accessEndDate?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionDenies?: string[];

  @ApiPropertyOptional({ description: 'Invitation email stub — not sent yet' })
  @IsOptional()
  @IsBoolean()
  sendInvitation?: boolean;
}
