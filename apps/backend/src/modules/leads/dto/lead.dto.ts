import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  LeadSource,
  LeadStatus,
  LeadTaskStatus,
} from '../schemas/lead.schema';

export class LeadContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  alternatePhone?: string | null;
}

export class CreateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string | null;

  @ApiPropertyOptional({ description: 'Preferred project' })
  @IsOptional()
  @IsMongoId()
  projectId?: string | null;

  @ApiProperty({ enum: LeadSource })
  @IsEnum(LeadSource)
  source!: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  campaignName?: string | null;

  @ApiProperty({ type: LeadContactDto })
  @ValidateNested()
  @Type(() => LeadContactDto)
  contact!: LeadContactDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  familyDetails?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  preferredLocation?: string | null;

  @ApiPropertyOptional({ example: '2bhk' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  unitPreference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  fundingSource?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  loanRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Search contact fullName, phone, or email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class TransitionLeadDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @ApiPropertyOptional({ description: 'Required when status is lost' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lostReason?: string | null;

  @ApiPropertyOptional({ description: 'Optional note appended as follow-up' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string | null;
}

export class AddLeadFollowUpDto {
  @ApiProperty()
  @IsDateString()
  at!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  note!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;
}

export class AddLeadTaskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class UpdateLeadTaskDto {
  @ApiProperty({ enum: LeadTaskStatus })
  @IsEnum(LeadTaskStatus)
  status!: LeadTaskStatus;
}

export class ConvertLeadDto {
  @ApiPropertyOptional({
    description:
      'Existing customer to link. When omitted, a minimal customer is created from lead contact.',
  })
  @IsOptional()
  @IsMongoId()
  customerId?: string;
}

export class AddLeadAttachmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  fileName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  filePath!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  mimeType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sizeBytes!: number;
}
