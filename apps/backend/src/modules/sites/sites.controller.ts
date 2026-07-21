import {
  Body,
  Controller,
  ForbiddenException,
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
import {
  CreateSiteDto,
  ListSitesQueryDto,
  UpdateSiteDto,
} from './dto/site.dto';
import { SitesService } from './sites.service';

@GlobalScope()
@ApiTags('Sites')
@ApiBearerAuth()
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Create project site' })
  create(@Body() dto: CreateSiteDto, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.create(dto, actor.companyId, actor.id);
  }

  @Get()
  @RequirePermissions('site.view')
  @ApiOperation({ summary: 'List sites (optionally by projectId)' })
  list(@Query() query: ListSitesQueryDto, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.list(query, actor.companyId);
  }

  @Get(':id')
  @RequirePermissions('site.view')
  @ApiOperation({ summary: 'Get site by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.getById(id, actor.companyId);
  }

  @Patch(':id')
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Update site' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.sitesService.update(id, dto, actor.companyId, actor.id);
  }
}
