import {
  Body,
  Controller,
  Delete,
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
  CreateSiteDiaryEntryDto,
  ListSiteDiaryQueryDto,
  UpdateSiteDiaryEntryDto,
} from './dto/site-diary.dto';
import { SiteDiaryService } from './site-diary.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'site-diary', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Site Diary')
@ApiBearerAuth()
@Controller('site-diary')
export class SiteDiaryController {
  constructor(private readonly service: SiteDiaryService) {}

  @Post()
  @RequirePermissions('site_diary.manage')
  @ApiOperation({ summary: 'Create site diary entry' })
  create(
    @Body() dto: CreateSiteDiaryEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('site_diary.view')
  @ApiOperation({ summary: 'List site diary entries (project / date / dpr)' })
  list(@Query() query: ListSiteDiaryQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('site_diary.view')
  @ApiOperation({ summary: 'Get site diary entry' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('site_diary.manage')
  @ApiOperation({ summary: 'Update site diary entry' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDiaryEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('site_diary.manage')
  @ApiOperation({ summary: 'Soft-delete site diary entry' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }
}
