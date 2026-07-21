import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateStockReservationDto,
  ListStockReservationsQueryDto,
  ReleaseStockReservationDto,
} from './dto/stock-reservation.dto';
import { StockReservationsService } from './stock-reservations.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Stock Reservations')
@ApiBearerAuth()
@Controller('stock-reservations')
export class StockReservationsController {
  constructor(private readonly service: StockReservationsService) {}

  @Post()
  @RequirePermissions('stock.reserve')
  @ApiOperation({ summary: 'Reserve available stock (soft hold)' })
  create(
    @Body() dto: CreateStockReservationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get('available')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'On-hand minus active reservations' })
  available(
    @Query('projectId') projectId: string,
    @Query('materialId') materialId: string,
    @Query('location') location?: string,
  ) {
    return this.service.getAvailable({ projectId, materialId, location });
  }

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List stock reservations' })
  list(@Query() query: ListStockReservationsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get stock reservation' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/release')
  @RequirePermissions('stock.reserve')
  @ApiOperation({ summary: 'Release reservation (partial or full)' })
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseStockReservationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.release(id, actor.id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('stock.reserve')
  @ApiOperation({ summary: 'Cancel active reservation' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
