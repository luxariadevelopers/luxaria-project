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
  AssignSiteIssueDto,
  CreateSiteIssueDto,
  ListSiteIssuesQueryDto,
  UpdateSiteIssueDto,
} from './dto/site-issue.dto';
import { SiteIssuesService } from './site-issues.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'site-issue', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Site Issues')
@ApiBearerAuth()
@Controller('site-issues')
export class SiteIssuesController {
  constructor(private readonly service: SiteIssuesService) {}

  @Post()
  @RequirePermissions('site_issue.create')
  @ApiOperation({ summary: 'Create site issue (open)' })
  create(@Body() dto: CreateSiteIssueDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('site_issue.view')
  @ApiOperation({ summary: 'List site issues' })
  list(@Query() query: ListSiteIssuesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('site_issue.view')
  @ApiOperation({ summary: 'Get site issue' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('site_issue.create')
  @ApiOperation({ summary: 'Update open/assigned site issue' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteIssueDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/assign')
  @RequirePermissions('site_issue.assign')
  @ApiOperation({ summary: 'Assign site issue (open/assigned → assigned)' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignSiteIssueDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.assign(id, dto, actor.id);
  }

  @Post(':id/resolve')
  @RequirePermissions('site_issue.assign')
  @ApiOperation({ summary: 'Resolve site issue (open/assigned → resolved)' })
  resolve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.resolve(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('site_issue.close')
  @ApiOperation({ summary: 'Close site issue (resolved → closed)' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.close(id, actor.id);
  }
}
