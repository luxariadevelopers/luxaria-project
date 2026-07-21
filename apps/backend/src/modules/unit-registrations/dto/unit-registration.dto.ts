import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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
import { UnitRegistrationStatus } from '../schemas/unit-registration.schema';

export class SubRegistrarOfficeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string | null;
}

export class RegistrationWitnessDto {
  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;
}

export class CreateUnitRegistrationDto {
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
  agreementId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ecReference?: string | null;

  @ApiPropertyOptional({ type: SubRegistrarOfficeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubRegistrarOfficeDto)
  sro?: SubRegistrarOfficeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stampDuty?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  registrationCharges?: number | null;

  @ApiPropertyOptional({ type: [RegistrationWitnessDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationWitnessDto)
  witnesses?: RegistrationWitnessDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  documentPath?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  documentFileName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateUnitRegistrationDto extends PartialType(
  OmitType(CreateUnitRegistrationDto, [
    'projectId',
    'bookingId',
    'customerId',
    'unitId',
  ] as const),
) {}

export class MarkRegisteredDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ecReference?: string | null;
}

export class ListUnitRegistrationsQueryDto extends PaginationQueryDto {
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
  agreementId?: string;

  @ApiPropertyOptional({ enum: UnitRegistrationStatus })
  @IsOptional()
  @IsEnum(UnitRegistrationStatus)
  status?: UnitRegistrationStatus;
}
