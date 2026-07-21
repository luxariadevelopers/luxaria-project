import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsString, MinLength } from 'class-validator';
import { WarrantyCategory } from '../../customer-warranties/schemas/customer-warranty.schema';

export class RaiseCustomerWarrantyDto {
  @ApiProperty()
  @IsMongoId()
  unitId!: string;

  @ApiProperty()
  @IsMongoId()
  bookingId!: string;

  @ApiProperty({ enum: WarrantyCategory })
  @IsEnum(WarrantyCategory)
  category!: WarrantyCategory;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  description!: string;
}
