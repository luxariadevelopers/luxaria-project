import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  AmendCommitmentDto,
  CancelCommitmentDto,
  CreateCommitmentDto,
  RecordReceiptDto,
} from './dto/create-commitment.dto';
import { ProjectCommitmentsService } from './project-commitments.service';
import { CommitmentStatus } from './schemas/contribution-commitment.schema';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'project-commitment', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Project Contribution Commitments')
@ApiBearerAuth()
@Controller('projects/:projectId/commitments')
export class ProjectCommitmentsController {
  constructor(private readonly service: ProjectCommitmentsService) {}

  @Post()
  @RequirePermissions('contribution_commitment.create')
  @ApiOperation({ summary: 'Create contribution commitment (draft)' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommitmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(projectId, dto, actor.id);
  }

  @Get()
  @RequirePermissions('contribution_commitment.view')
  @ApiOperation({ summary: 'List commitments' })
  list(
    @Param('projectId') projectId: string,
    @Query()
    query: PaginationQueryDto & {
      participantId?: string;
      status?: CommitmentStatus;
    },
  ) {
    return this.service.list(projectId, query);
  }

  @Get('summary')
  @RequirePermissions('contribution_commitment.view')
  @ApiOperation({
    summary: 'Track committed, received, and pending amounts',
  })
  summary(
    @Param('projectId') projectId: string,
    @Query('participantId') participantId?: string,
  ) {
    return this.service.summary(projectId, participantId);
  }

  @Get('by-number/:commitmentNumber/history')
  @RequirePermissions('contribution_commitment.view')
  @ApiOperation({ summary: 'Version history for a commitment number' })
  history(
    @Param('projectId') projectId: string,
    @Param('commitmentNumber') commitmentNumber: string,
  ) {
    return this.service.listHistory(projectId, commitmentNumber);
  }

  @Get(':id')
  @RequirePermissions('contribution_commitment.view')
  @ApiOperation({ summary: 'View commitment' })
  getById(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(projectId, id);
  }

  @Post(':id/submit')
  @RequirePermissions('contribution_commitment.submit')
  @ApiOperation({ summary: 'Submit commitment for approval' })
  submit(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.submit(projectId, id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('contribution_commitment.approve')
  @ApiOperation({ summary: 'Approve submitted commitment' })
  approve(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.approve(projectId, id, actor.id);
  }

  @Post(':id/amend')
  @RequirePermissions('contribution_commitment.amend')
  @ApiOperation({
    summary: 'Amend approved commitment (creates new version; no in-place edit)',
  })
  amend(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: AmendCommitmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.amend(projectId, id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('contribution_commitment.cancel')
  @ApiOperation({ summary: 'Cancel commitment' })
  cancel(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: CancelCommitmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(projectId, id, dto, actor.id);
  }

  @Post(':id/receipts')
  @RequirePermissions('contribution_commitment.record_receipt')
  @ApiOperation({ summary: 'Record amount received against commitment' })
  recordReceipt(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: RecordReceiptDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.recordReceipt(projectId, id, dto, actor.id);
  }
}
