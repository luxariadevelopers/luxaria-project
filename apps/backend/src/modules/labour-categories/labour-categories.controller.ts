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
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateLabourCategoryDto,
  CreateLabourCategoryRateDto,
  ListLabourCategoriesQueryDto,
  ListLabourCategoryRatesQueryDto,
  ResolveLabourCategoryRateQueryDto,
  UpdateLabourCategoryDto,
  UpdateLabourCategoryRateDto,
} from './dto/labour-category.dto';
import { LabourCategoriesService } from './labour-categories.service';

@ApiTags('Labour Categories')
@ApiBearerAuth()
@Controller('labour-categories')
export class LabourCategoriesController {
  constructor(private readonly service: LabourCategoriesService) {}

  @Post()
  @RequirePermissions('labour_category.manage')
  @ApiOperation({ summary: 'Create labour category' })
  create(
    @Body() dto: CreateLabourCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Post('seed-standard')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({
    summary:
      'Seed standard labour categories (Mason, Helper, Carpenter, …) — idempotent',
  })
  seed(@CurrentUser() actor: AuthUser) {
    return this.service.seedStandard(actor.id);
  }

  @Get('resolve-rate')
  @RequirePermissions('labour_category.view')
  @ApiOperation({
    summary:
      'Resolve applicable daily/OT rate (project+contractor → project → contractor → company)',
  })
  resolveRate(@Query() query: ResolveLabourCategoryRateQueryDto) {
    return this.service.resolveRate(query);
  }

  @Get('by-code/:categoryCode')
  @RequirePermissions('labour_category.view')
  @ApiOperation({ summary: 'Get labour category by code' })
  getByCode(@Param('categoryCode') categoryCode: string) {
    return this.service.getByCode(categoryCode);
  }

  @Get()
  @RequirePermissions('labour_category.view')
  @ApiOperation({ summary: 'List labour categories' })
  list(@Query() query: ListLabourCategoriesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('labour_category.view')
  @ApiOperation({ summary: 'Get labour category by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({ summary: 'Update labour category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabourCategoryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({ summary: 'Activate labour category' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({ summary: 'Deactivate labour category' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deactivate(id, actor.id);
  }

  @Post(':id/rates')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({
    summary: 'Create project- and/or contractor-specific rate override',
  })
  createRate(
    @Param('id') id: string,
    @Body() dto: CreateLabourCategoryRateDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createRate(id, dto, actor.id);
  }

  @Get(':id/rates')
  @RequirePermissions('labour_category.view')
  @ApiOperation({ summary: 'List rate overrides for a labour category' })
  listRates(
    @Param('id') id: string,
    @Query() query: ListLabourCategoryRatesQueryDto,
  ) {
    return this.service.listRates(id, query);
  }

  @Patch('rates/:rateId')
  @RequirePermissions('labour_category.manage')
  @ApiOperation({ summary: 'Update a labour category rate override' })
  updateRate(
    @Param('rateId') rateId: string,
    @Body() dto: UpdateLabourCategoryRateDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateRate(rateId, dto, actor.id);
  }
}
