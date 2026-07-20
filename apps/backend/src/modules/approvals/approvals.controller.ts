import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ApprovalsService } from './approvals.service';
import {
  ApprovalActionDto,
  CancelApprovalDto,
  CreateApprovalRequestDto,
  UpsertApprovalWorkflowDto,
} from './dto/approval.dto';
import { ApprovalStatus } from './schemas/approval-request.schema';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller()
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Put('approval-workflows')
  @RequirePermissions('approval.configure')
  @ApiOperation({ summary: 'Create or update approval workflow definition' })
  upsertWorkflow(
    @Body() dto: UpsertApprovalWorkflowDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.upsertWorkflow(dto, actor.id);
  }

  @Get('approval-workflows/:module/:entityType')
  @RequirePermissions('approval.configure')
  @ApiOperation({ summary: 'Get active workflow for module/entityType' })
  getWorkflow(
    @Param('module') module: string,
    @Param('entityType') entityType: string,
  ) {
    return this.service.getWorkflow(module, entityType);
  }

  @Post('projects/:projectId/approvals')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Create approval request (draft, optional submit)' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApprovalRequestDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(projectId, dto, actor.id);
  }

  @Get('projects/:projectId/approvals')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'List approval requests for a project' })
  list(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: AuthUser,
    @Query()
    query: PaginationQueryDto & {
      status?: ApprovalStatus;
      module?: string;
      entityType?: string;
    },
  ) {
    return this.service.list(projectId, actor.id, query);
  }

  @Get('projects/:projectId/approvals/:id')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'View approval request' })
  getById(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.getById(projectId, id, actor.id);
  }

  @Get('projects/:projectId/approvals/:id/timeline')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'View immutable approval timeline' })
  timeline(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.getTimeline(projectId, id, actor.id);
  }

  @Post('projects/:projectId/approvals/:id/submit')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Submit draft/returned request for approval' })
  submit(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.submit(projectId, id, actor.id);
  }

  @Post('projects/:projectId/approvals/:id/approve')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Approve current step' })
  approve(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approve(projectId, id, actor.id, dto);
  }

  @Post('projects/:projectId/approvals/:id/reject')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Reject approval request' })
  reject(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(projectId, id, actor.id, dto);
  }

  @Post('projects/:projectId/approvals/:id/return')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Return request for correction' })
  returnForCorrection(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.returnForCorrection(projectId, id, actor.id, dto);
  }

  @Post('projects/:projectId/approvals/:id/cancel')
  @RequirePermissions('approval.act')
  @ApiOperation({
    summary:
      'Cancel approval request (requester, or user with approval.cancel)',
  })
  cancel(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: CancelApprovalDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(projectId, id, actor.id, dto);
  }

  @Post('projects/:projectId/approvals/:id/escalate')
  @RequirePermissions('approval.act')
  @ApiOperation({ summary: 'Escalate overdue step to fallback role' })
  escalate(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.escalate(projectId, id, actor.id);
  }
}
