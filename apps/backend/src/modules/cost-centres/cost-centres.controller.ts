import {
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
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CostCentresService } from './cost-centres.service';
import {
  CreateCostCentreDto,
  ListCostCentresQueryDto,
  UpdateCostCentreDto,
} from './dto/cost-centre.dto';

@GlobalScope()
@ApiTags('Cost Centres')
@ApiBearerAuth()
@Controller('cost-centres')
export class CostCentresController {
  constructor(private readonly service: CostCentresService) {}

  @Post()
  @RequirePermissions('cost_centre.manage')
  @ApiOperation({ summary: 'Create cost / profit centre' })
  create(@Body() dto: CreateCostCentreDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('cost_centre.view')
  @ApiOperation({
    summary: 'List cost centres (filter by company, project, kind, status, search)',
  })
  list(@Query() query: ListCostCentresQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('cost_centre.view')
  @ApiOperation({ summary: 'Get cost centre' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('cost_centre.manage')
  @ApiOperation({ summary: 'Update cost centre' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCentreDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('cost_centre.manage')
  @ApiOperation({ summary: 'Activate cost centre' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('cost_centre.manage')
  @ApiOperation({ summary: 'Deactivate cost centre' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deactivate(id, actor.id);
  }
}
