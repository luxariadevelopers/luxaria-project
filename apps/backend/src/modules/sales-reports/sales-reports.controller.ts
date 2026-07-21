import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { SalesReportsService } from './sales-reports.service';

class SalesReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number = 50;
}

@ProjectScoped({ mode: 'filter', operation: 'read', required: false })
@ApiTags('Sales Reports')
@ApiBearerAuth()
@Controller('sales/reports')
export class SalesReportsController {
  constructor(private readonly service: SalesReportsService) {}

  @Get('lead-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Lead register' })
  leadRegister(@Query() query: SalesReportQueryDto) {
    return this.service.leadRegister(query);
  }

  @Get('sales-funnel')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Sales funnel — counts by lead status' })
  salesFunnel(@Query() query: SalesReportQueryDto) {
    return this.service.salesFunnel(query);
  }

  @Get('unit-availability')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Unit availability — counts by unit status' })
  unitAvailability(@Query() query: SalesReportQueryDto) {
    return this.service.unitAvailability(query);
  }

  @Get('booking-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Booking register' })
  bookingRegister(@Query() query: SalesReportQueryDto) {
    return this.service.bookingRegister(query);
  }

  @Get('cancellation-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Cancellation register' })
  cancellationRegister(@Query() query: SalesReportQueryDto) {
    return this.service.cancellationRegister(query);
  }

  @Get('demand-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Payment demand register' })
  demandRegister(@Query() query: SalesReportQueryDto) {
    return this.service.demandRegister(query);
  }

  @Get('collection-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Collection register (customer receipts)' })
  collectionRegister(@Query() query: SalesReportQueryDto) {
    return this.service.collectionRegister(query);
  }

  @Get('outstanding')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Outstanding unpaid demands' })
  outstanding(@Query() query: SalesReportQueryDto) {
    return this.service.outstanding(query);
  }

  @Get('loan-status')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Customer loan status register' })
  loanStatus(@Query() query: SalesReportQueryDto) {
    return this.service.loanStatus(query);
  }

  @Get('registration-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Unit registration register' })
  registrationRegister(@Query() query: SalesReportQueryDto) {
    return this.service.registrationRegister(query);
  }

  @Get('handover-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Unit handover register' })
  handoverRegister(@Query() query: SalesReportQueryDto) {
    return this.service.handoverRegister(query);
  }

  @Get('warranty-register')
  @RequirePermissions('sales_report.view')
  @ApiOperation({ summary: 'Warranty ticket register' })
  warrantyRegister(@Query() query: SalesReportQueryDto) {
    return this.service.warrantyRegister(query);
  }
}
