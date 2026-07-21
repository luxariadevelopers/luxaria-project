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
  CreateUnitRegistrationDto,
  ListUnitRegistrationsQueryDto,
  MarkRegisteredDto,
  UpdateUnitRegistrationDto,
} from './dto/unit-registration.dto';
import { UnitRegistrationsService } from './unit-registrations.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'unit-registration', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Unit Registrations')
@ApiBearerAuth()
@Controller('unit-registrations')
export class UnitRegistrationsController {
  constructor(private readonly service: UnitRegistrationsService) {}

  @Post()
  @RequirePermissions('registration.manage')
  @ApiOperation({ summary: 'Create draft unit registration' })
  create(
    @Body() dto: CreateUnitRegistrationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('registration.view')
  @ApiOperation({ summary: 'List unit registrations' })
  list(@Query() query: ListUnitRegistrationsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('registration.view')
  @ApiOperation({ summary: 'Get unit registration' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('registration.manage')
  @ApiOperation({ summary: 'Update draft unit registration' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitRegistrationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('registration.manage')
  @ApiOperation({ summary: 'Submit draft → submitted' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/mark-registered')
  @RequirePermissions('registration.manage')
  @ApiOperation({ summary: 'Mark submitted registration as registered' })
  markRegistered(
    @Param('id') id: string,
    @Body() dto: MarkRegisteredDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.markRegistered(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('registration.manage')
  @ApiOperation({ summary: 'Cancel draft or submitted registration' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.cancel(id, actor.id);
  }
}
