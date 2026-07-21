import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  AttachSitePhotoDto,
  ListSitePhotosQueryDto,
} from './dto/site-photo.dto';
import { SitePhotosService } from './site-photos.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'site-photo', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Site Photos')
@ApiBearerAuth()
@Controller('site-photos')
export class SitePhotosController {
  constructor(private readonly service: SitePhotosService) {}

  @Post()
  @RequirePermissions('document.upload')
  @ApiOperation({
    summary:
      'Attach geo/version metadata to an existing document for a SE link',
  })
  attach(@Body() dto: AttachSitePhotoDto, @CurrentUser() actor: AuthUser) {
    return this.service.attach(dto, actor.id);
  }

  @Get()
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'List site photo metadata' })
  list(@Query() query: ListSitePhotosQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'Get site photo metadata' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Delete(':id')
  @RequirePermissions('document.upload')
  @ApiOperation({ summary: 'Soft-remove site photo metadata link' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.remove(id, actor.id);
  }
}
