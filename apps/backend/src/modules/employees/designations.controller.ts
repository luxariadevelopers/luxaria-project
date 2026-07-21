import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { DesignationsService } from './designations.service';
import {
  CreateDesignationDto,
  UpdateDesignationDto,
} from './dto/designation.dto';

@GlobalScope()
@ApiTags('Designations')
@ApiBearerAuth()
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions('designation.manage')
  @ApiOperation({ summary: 'Create designation' })
  create(@Body() dto: CreateDesignationDto, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.designationsService.create(dto, actor.companyId, actor.id);
  }

  @Get()
  @RequirePermissions('designation.view')
  @ApiOperation({ summary: 'List designations' })
  list(@CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.designationsService.list(actor.companyId);
  }

  @Patch(':id')
  @RequirePermissions('designation.manage')
  @ApiOperation({ summary: 'Update designation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDesignationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.designationsService.update(id, dto, actor.companyId, actor.id);
  }

  @Post(':id/activate')
  @RequirePermissions('designation.manage')
  @ApiOperation({ summary: 'Activate designation' })
  activate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.designationsService.activate(id, actor.companyId, actor.id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('designation.manage')
  @ApiOperation({ summary: 'Deactivate designation' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return this.designationsService.deactivate(id, actor.companyId, actor.id);
  }
}
