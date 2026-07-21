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
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UnitQuotationStatus } from '../schemas/unit-quotation.schema';

export class UnitQuotationPricingDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plc?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  floorRise?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carPark?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  clubHouse?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  corpusFund?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  registrationEstimate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gst?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stampDutyEstimate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offerAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCharges?: number;
}

export class CreateUnitQuotationDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  leadId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @ApiPropertyOptional({ type: UnitQuotationPricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitQuotationPricingDto)
  pricing?: UnitQuotationPricingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  terms?: string | null;
}

export class UpdateUnitQuotationDto extends PartialType(
  OmitType(CreateUnitQuotationDto, ['projectId', 'unitId'] as const),
) {}

export class RejectUnitQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class ReviseUnitQuotationDto extends PartialType(
  OmitType(CreateUnitQuotationDto, ['projectId', 'unitId'] as const),
) {}

export class ConvertUnitQuotationDto {
  @ApiPropertyOptional({
    description: 'Existing booking id to link (stub until booking auto-create)',
  })
  @IsOptional()
  @IsMongoId()
  bookingId?: string;

  @ApiPropertyOptional({
    description:
      'Existing reservation id to link (stub until reservation auto-create)',
  })
  @IsOptional()
  @IsMongoId()
  reservationId?: string;
}

export class ListUnitQuotationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  unitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ enum: UnitQuotationStatus })
  @IsOptional()
  @IsEnum(UnitQuotationStatus)
  status?: UnitQuotationStatus;
}
