import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  WarrantyCategory,
  WarrantyStatus,
} from '../schemas/customer-warranty.schema';

export class CreateCustomerWarrantyDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  handoverId?: string | null;

  @ApiProperty({ enum: WarrantyCategory })
  @IsEnum(WarrantyCategory)
  category!: WarrantyCategory;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  slaDueAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  raisedAt?: string;
}

export class UpdateCustomerWarrantyDto extends PartialType(
  OmitType(CreateCustomerWarrantyDto, [
    'projectId',
    'bookingId',
    'customerId',
    'unitId',
  ] as const),
) {}

export class TransitionCustomerWarrantyDto {
  @ApiProperty({ enum: WarrantyStatus })
  @IsEnum(WarrantyStatus)
  status!: WarrantyStatus;
}

export class AssignCustomerWarrantyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedContractorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedUserId?: string | null;
}

export class AddMaterialUsageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  materialName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string | null;
}

export class AddCompletionPhotoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  filePath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;
}

export class ListCustomerWarrantyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  handoverId?: string;

  @ApiPropertyOptional({ enum: WarrantyCategory })
  @IsOptional()
  @IsEnum(WarrantyCategory)
  category?: WarrantyCategory;

  @ApiPropertyOptional({ enum: WarrantyStatus })
  @IsOptional()
  @IsEnum(WarrantyStatus)
  status?: WarrantyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedContractorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedUserId?: string;
}
