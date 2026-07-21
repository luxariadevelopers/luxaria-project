import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateDrawingDto,
  CreateDrawingRevisionDto,
  ListDrawingsQueryDto,
} from './dto/drawing.dto';
import { DrawingsService } from './drawings.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Drawings')
@ApiBearerAuth()
@Controller('drawings')
export class DrawingsController {
  constructor(private readonly service: DrawingsService) {}

  @Post()
  @RequirePermissions('drawing.manage')
  @ApiOperation({ summary: 'Create drawing register entry (first revision)' })
  create(@Body() dto: CreateDrawingDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('drawing.view')
  @ApiOperation({
    summary: 'List drawings (site-scoped when siteId provided)',
  })
  list(
    @Query() query: ListDrawingsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('drawing.view')
  @ApiOperation({ summary: 'Get drawing by id' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getById(id, actor.id);
  }

  @Post(':id/revisions')
  @RequirePermissions('drawing.manage')
  @ApiOperation({
    summary:
      'Upload/replace revision — supersedes previous (isLatest flip + status)',
  })
  createRevision(
    @Param('id') id: string,
    @Body() dto: CreateDrawingRevisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createRevision(id, dto, actor.id);
  }

  @Post(':id/archive')
  @RequirePermissions('drawing.manage')
  @ApiOperation({ summary: 'Archive drawing' })
  archive(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.archive(id, actor.id);
  }
}
