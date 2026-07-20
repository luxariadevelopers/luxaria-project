import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import { MaterialIssueStatus } from '../schemas/material-issue.schema';

export class MaterialIssueItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateMaterialIssueDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  issueDate!: string;

  @ApiPropertyOptional({ description: 'Defaults to the authenticated user' })
  @IsOptional()
  @IsMongoId()
  issuedBy?: string;

  @ApiProperty({ description: 'User who receives the materials on site' })
  @IsMongoId()
  receivedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  blockId?: string | null;

  @ApiPropertyOptional({ example: 'L2' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  floorId?: string | null;

  @ApiProperty({ description: 'BOQ item the issue is charged against' })
  @IsMongoId()
  boqItemId!: string;

  @ApiProperty({ example: 'Block A – Column casting' })
  @IsString()
  @MaxLength(240)
  workLocation!: string;

  @ApiPropertyOptional({
    example: 'Main Store',
    description: 'Store/yard location for stock balance (default empty)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeLocation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({ type: [MaterialIssueItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaterialIssueItemDto)
  items!: MaterialIssueItemDto[];
}

export class UpdateMaterialIssueDto {
  @ApiPropertyOptional({ example: '2026-07-17' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  receivedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  blockId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  floorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  workLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeLocation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [MaterialIssueItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaterialIssueItemDto)
  items?: MaterialIssueItemDto[];
}

export class AttachMaterialIssueSignaturesDto {
  @ApiProperty({ description: 'Recipient (receiver) signature document id' })
  @IsMongoId()
  recipientSignatureDocumentId!: string;

  @ApiProperty({
    description: 'SHA-256 hex checksum of the recipient signature document',
    example: 'a'.repeat(64),
  })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'recipientSignatureChecksum must be a 64-char hex SHA-256',
  })
  recipientSignatureChecksum!: string;

  @ApiPropertyOptional({ description: 'Issuer signature document id' })
  @IsOptional()
  @IsMongoId()
  issuerSignatureDocumentId?: string;

  @ApiPropertyOptional({
    description: 'SHA-256 hex checksum of the issuer signature document',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'issuerSignatureChecksum must be a 64-char hex SHA-256',
  })
  issuerSignatureChecksum?: string;
}

export class MaterialReturnItemDto {
  @ApiProperty()
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit!: MaterialUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class CreateMaterialReturnDto {
  @ApiProperty({ example: '2026-07-18' })
  @IsDateString()
  returnDate!: string;

  @ApiPropertyOptional({ description: 'Defaults to the authenticated user' })
  @IsOptional()
  @IsMongoId()
  returnedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiProperty({ type: [MaterialReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MaterialReturnItemDto)
  items!: MaterialReturnItemDto[];
}

export class ListMaterialIssuesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: MaterialIssueStatus })
  @IsOptional()
  @IsEnum(MaterialIssueStatus)
  status?: MaterialIssueStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  contractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  boqItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
