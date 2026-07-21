import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateWarehouseLocationDto,
  ListWarehouseLocationsQueryDto,
  UpdateWarehouseLocationDto,
} from './dto/warehouse-location.dto';
import { WarehouseLocationsService } from './warehouse-locations.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Warehouse Locations')
@ApiBearerAuth()
@Controller('warehouse-locations')
export class WarehouseLocationsController {
  constructor(private readonly service: WarehouseLocationsService) {}

  @Post()
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Create zone / rack / bin under a warehouse' })
  create(
    @Body() dto: CreateWarehouseLocationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, this.requireCompanyId(actor));
  }

  @Get()
  @RequirePermissions('site.view')
  @ApiOperation({ summary: 'List warehouse locations' })
  list(
    @Query() query: ListWarehouseLocationsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.list(query, this.requireCompanyId(actor));
  }

  @Get(':id')
  @RequirePermissions('site.view')
  @ApiOperation({ summary: 'Get warehouse location' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getById(id, this.requireCompanyId(actor));
  }

  @Patch(':id')
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Update warehouse location' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseLocationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, this.requireCompanyId(actor));
  }

  private requireCompanyId(actor: AuthUser): string {
    if (!actor.companyId) {
      throw new BadRequestException('Authenticated user missing companyId');
    }
    return actor.companyId;
  }
}
