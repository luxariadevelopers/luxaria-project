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
  AddLeadAttachmentDto,
  AddLeadFollowUpDto,
  AddLeadTaskDto,
  ConvertLeadDto,
  CreateLeadDto,
  ListLeadsQueryDto,
  TransitionLeadDto,
  UpdateLeadDto,
  UpdateLeadTaskDto,
} from './dto/lead.dto';
import { LeadsService } from './leads.service';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'lead', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Create a CRM lead' })
  create(@Body() dto: CreateLeadDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('lead.view')
  @ApiOperation({ summary: 'List leads with filters' })
  list(@Query() query: ListLeadsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('lead.view')
  @ApiOperation({ summary: 'Get lead by id' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Update lead draft fields (not won/lost)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/transition')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Transition lead status along CRM pipeline' })
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionLeadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.transition(id, dto, actor.id);
  }

  @Post(':id/follow-ups')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Add a follow-up note' })
  addFollowUp(
    @Param('id') id: string,
    @Body() dto: AddLeadFollowUpDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addFollowUp(id, dto, actor.id);
  }

  @Post(':id/tasks')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Add a task' })
  addTask(
    @Param('id') id: string,
    @Body() dto: AddLeadTaskDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addTask(id, dto, actor.id);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Complete or reopen a task' })
  updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateLeadTaskDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateTask(id, taskId, dto, actor.id);
  }

  @Post(':id/convert')
  @RequirePermissions('lead.convert')
  @ApiOperation({
    summary: 'Convert lead to customer (link existing or create minimal)',
  })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.convert(id, dto, actor.id);
  }

  @Post(':id/attachments')
  @RequirePermissions('lead.manage')
  @ApiOperation({ summary: 'Add attachment metadata' })
  addAttachment(
    @Param('id') id: string,
    @Body() dto: AddLeadAttachmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.addAttachment(id, dto, actor.id);
  }
}
