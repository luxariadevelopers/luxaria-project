import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ProjectSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dprEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  labourEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inventoryEnabled?: boolean;

  @ApiPropertyOptional({
    enum: ['weighted_average', 'fifo', 'moving_average'],
    description: 'Inventory costing method for the project',
  })
  @IsOptional()
  @IsString()
  @IsIn(['weighted_average', 'fifo', 'moving_average'])
  inventoryCostingMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  equipmentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  procurementEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pettyCashEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  boqEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  billingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerBookingEnabled?: boolean;
}
