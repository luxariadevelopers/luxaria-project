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
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateFixedAssetDto,
  DepreciateFixedAssetDto,
  DisposeFixedAssetDto,
  ListFixedAssetDepreciationsQueryDto,
  ListFixedAssetsQueryDto,
  UpdateFixedAssetDto,
} from './dto/fixed-asset.dto';
import { FixedAssetsService } from './fixed-assets.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'fixed-asset', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Fixed Assets')
@ApiBearerAuth()
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private readonly service: FixedAssetsService) {}

  @Post()
  @RequirePermissions('fixed_asset.manage')
  @ApiOperation({ summary: 'Create fixed asset (draft)' })
  create(@Body() dto: CreateFixedAssetDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get('depreciations')
  @RequirePermissions('fixed_asset.view')
  @ApiOperation({ summary: 'List fixed asset depreciation entries' })
  listDepreciations(@Query() query: ListFixedAssetDepreciationsQueryDto) {
    return this.service.listDepreciations(query);
  }

  @Get()
  @RequirePermissions('fixed_asset.view')
  @ApiOperation({ summary: 'List fixed assets' })
  list(@Query() query: ListFixedAssetsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id/register')
  @RequirePermissions('fixed_asset.view')
  @ApiOperation({ summary: 'Fixed asset register summary' })
  register(@Param('id') id: string) {
    return this.service.register(id);
  }

  @Get(':id')
  @RequirePermissions('fixed_asset.view')
  @ApiOperation({ summary: 'Get fixed asset' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('fixed_asset.manage')
  @ApiOperation({ summary: 'Update draft or active fixed asset' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFixedAssetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('fixed_asset.manage')
  @ApiOperation({ summary: 'Activate draft asset' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activate(id, actor.id);
  }

  @Post(':id/dispose')
  @RequirePermissions('fixed_asset.manage')
  @ApiOperation({ summary: 'Dispose active asset' })
  dispose(
    @Param('id') id: string,
    @Body() dto: DisposeFixedAssetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.dispose(id, dto, actor.id);
  }

  @Post(':id/depreciate')
  @RequirePermissions('fixed_asset.depreciate')
  @ApiOperation({
    summary:
      'Record period depreciation (SLM auto-compute if amount omitted); posts journal when GL accounts configured',
  })
  depreciate(
    @Param('id') id: string,
    @Body() dto: DepreciateFixedAssetDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.depreciate(id, dto, actor.id);
  }
}
