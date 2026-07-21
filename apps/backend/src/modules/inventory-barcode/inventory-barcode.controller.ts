import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { GenerateBarcodeDto, ScanBarcodeDto } from './dto/barcode.dto';
import { InventoryBarcodeService } from './inventory-barcode.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Inventory Barcode')
@ApiBearerAuth()
@Controller('inventory-barcode')
export class InventoryBarcodeController {
  constructor(private readonly service: InventoryBarcodeService) {}

  @Post('generate')
  @RequirePermissions('stock.barcode')
  @ApiOperation({ summary: 'Generate QR/barcode payload for a material' })
  generate(@Body() dto: GenerateBarcodeDto) {
    return this.service.generate(dto);
  }

  @Post('scan')
  @RequirePermissions('stock.barcode')
  @ApiOperation({
    summary: 'Resolve scanned QR/barcode for receive / issue / transfer / count',
  })
  scan(@Body() dto: ScanBarcodeDto) {
    return this.service.scan(dto);
  }
}
