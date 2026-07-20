import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  buildPaginationMeta,
  type PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { DatabaseService } from '../../database/services/database.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { PermissionsService } from '../rbac/permissions.service';
import {
  toPublicApprovalRequest,
  toPublicWorkflow,
  type PublicTimelineEntry,
} from './approvals.mapper';
import type {
  ApprovalActionDto,
  CancelApprovalDto,
  CreateApprovalRequestDto,
  UpsertApprovalWorkflowDto,
} from './dto/approval.dto';
import {
  ApprovalHistory,
  ApprovalHistoryAction,
} from './schemas/approval-history.schema';
import {
  ApprovalRequest,
  ApprovalStatus,
} from './schemas/approval-request.schema';
import {
  ApprovalStepConfig,
  ApprovalWorkflow,
} from './schemas/approval-workflow.schema';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectModel(ApprovalWorkflow.name)
    private readonly workflowModel: Model<ApprovalWorkflow>,
    @InjectModel(ApprovalRequest.name)
    private readonly requestModel: Model<ApprovalRequest>,
    @InjectModel(ApprovalHistory.name)
    private readonly historyModel: Model<ApprovalHistory>,
    private readonly numberingService: NumberingService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly permissionsService: PermissionsService,
    private readonly databaseService: DatabaseService,
  ) {}

  async upsertWorkflow(dto: UpsertApprovalWorkflowDto, actorId: string) {
    this.assertValidSteps(dto.steps);

    const module = dto.module.trim().toLowerCase();
    const entityType = dto.entityType.trim().toLowerCase();

    const existing = await this.workflowModel
      .findOne({ module, entityType, isActive: true })
      .exec();

    const steps = this.normalizeSteps(dto.steps);

    if (existing) {
      existing.name = dto.name?.trim() ?? existing.name;
      existing.allowSelfApprove = dto.allowSelfApprove ?? existing.allowSelfApprove;
      existing.steps = steps;
      existing.set('updatedBy', new Types.ObjectId(actorId));
      await existing.save();
      return createSuccessResponse(
        toPublicWorkflow(existing),
        'Approval workflow updated',
      );
    }

    const created = await this.workflowModel.create({
      module,
      entityType,
      name: dto.name?.trim() ?? null,
      isActive: true,
      allowSelfApprove: dto.allowSelfApprove ?? false,
      steps,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicWorkflow(created),
      'Approval workflow created',
    );
  }

  async getWorkflow(module: string, entityType: string) {
    const workflow = await this.requireActiveWorkflow(module, entityType);
    return createSuccessResponse(toPublicWorkflow(workflow));
  }

  async create(
    projectId: string,
    dto: CreateApprovalRequestDto,
    actorId: string,
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'create',
    );

    const module = dto.module.trim().toLowerCase();
    const entityType = dto.entityType.trim().toLowerCase();
    const workflow = await this.requireActiveWorkflow(module, entityType);
    this.assertAmountHasApplicableSteps(workflow.steps, dto.amount);

    const open = await this.requestModel
      .findOne({
        module,
        entityType,
        entityId: new Types.ObjectId(dto.entityId),
        status: {
          $in: [
            ApprovalStatus.Draft,
            ApprovalStatus.Pending,
            ApprovalStatus.Returned,
          ],
        },
      })
      .lean()
      .exec();

    if (open) {
      throw new ConflictException(
        'An open approval request already exists for this entity',
      );
    }

    const approvalCode = await this.numberingService.nextCode(
      NumberEntityType.APPROVAL,
      { projectId, projectScoped: true },
    );

    const now = new Date();
    const row = await this.requestModel.create({
      approvalCode,
      module,
      entityType,
      entityId: new Types.ObjectId(dto.entityId),
      projectId: new Types.ObjectId(projectId),
      workflowId: workflow._id,
      requestedBy: new Types.ObjectId(actorId),
      requestedAt: now,
      amount: dto.amount,
      currentStep: 0,
      status: ApprovalStatus.Draft,
      reason: dto.reason?.trim() ?? null,
      stepEnteredAt: null,
      escalated: false,
      approvalHistory: [],
      createdBy: new Types.ObjectId(actorId),
    });

    if (dto.submit) {
      return this.submit(projectId, String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicApprovalRequest(row),
      'Approval request created as draft',
    );
  }

  async submit(projectId: string, id: string, actorId: string) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'update',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (
        row.status !== ApprovalStatus.Draft &&
        row.status !== ApprovalStatus.Returned
      ) {
        throw new BadRequestException(
          'Only draft or returned requests can be submitted',
        );
      }
      if (String(row.requestedBy) !== actorId) {
        throw new ForbiddenException(
          'Only the requester can submit this approval request',
        );
      }

      const workflow = await this.requireWorkflowById(
        String(row.workflowId),
        session,
      );
      const firstStep = this.firstApplicableStep(workflow.steps, row.amount);
      if (!firstStep) {
        throw new BadRequestException(
          'No approval step applies to this amount',
        );
      }

      const now = new Date();
      row.status = ApprovalStatus.Pending;
      row.currentStep = firstStep.stepNumber;
      row.stepEnteredAt = now;
      row.escalated = false;
      row.requestedAt = now;
      row.set('updatedBy', new Types.ObjectId(actorId));

      await this.appendHistory(row, {
        stepNumber: firstStep.stepNumber,
        action: ApprovalHistoryAction.Submitted,
        actorId,
        comment: null,
        at: now,
        metadata: { amount: row.amount },
        session,
      });

      await row.save({ session });
      return createSuccessResponse(
        toPublicApprovalRequest(row),
        'Submitted for approval',
      );
    });
  }

  async approve(
    projectId: string,
    id: string,
    actorId: string,
    dto: ApprovalActionDto = {},
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'approve',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (row.status !== ApprovalStatus.Pending) {
        throw new BadRequestException('Only pending requests can be approved');
      }

      const workflow = await this.requireWorkflowById(
        String(row.workflowId),
        session,
      );
      this.assertNotSelfApprove(row, workflow.allowSelfApprove, actorId);

      const step = this.requireCurrentStep(workflow.steps, row);
      this.assertAmountWithinStep(step, row.amount);

      const access = await this.permissionsService.resolveUserAccess(actorId);
      await this.assertActorEligible(step, access.roleIds, actorId, row.escalated);

      const priorApprovals = await this.historyModel
        .find({
          approvalRequestId: row._id,
          stepNumber: step.stepNumber,
          action: ApprovalHistoryAction.Approved,
        })
        .session(session ?? null)
        .lean()
        .exec();

      if (priorApprovals.some((h) => String(h.actorId) === actorId)) {
        throw new ConflictException('You have already approved this step');
      }

      const now = new Date();
      await this.appendHistory(row, {
        stepNumber: step.stepNumber,
        action: ApprovalHistoryAction.Approved,
        actorId,
        comment: dto.comment?.trim() ?? null,
        at: now,
        metadata: null,
        session,
      });

      const approvalsAfter = [
        ...priorApprovals.map((h) => String(h.actorId)),
        actorId,
      ];

      if (!this.isStepComplete(step, approvalsAfter, access)) {
        row.set('updatedBy', new Types.ObjectId(actorId));
        await row.save({ session });
        return createSuccessResponse(
          toPublicApprovalRequest(row),
          'Approval recorded; awaiting remaining approvers',
        );
      }

      const next = this.nextApplicableStep(
        workflow.steps,
        step.stepNumber,
        row.amount,
      );

      if (next) {
        row.currentStep = next.stepNumber;
        row.stepEnteredAt = now;
        row.escalated = false;
        row.status = ApprovalStatus.Pending;
      } else {
        row.status = ApprovalStatus.Approved;
        row.stepEnteredAt = null;
      }

      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save({ session });

      return createSuccessResponse(
        toPublicApprovalRequest(row),
        next ? 'Step approved; advanced to next step' : 'Request fully approved',
      );
    });
  }

  async reject(
    projectId: string,
    id: string,
    actorId: string,
    dto: ApprovalActionDto = {},
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'approve',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (row.status !== ApprovalStatus.Pending) {
        throw new BadRequestException('Only pending requests can be rejected');
      }

      const workflow = await this.requireWorkflowById(
        String(row.workflowId),
        session,
      );
      this.assertNotSelfApprove(row, workflow.allowSelfApprove, actorId);

      const step = this.requireCurrentStep(workflow.steps, row);
      this.assertAmountWithinStep(step, row.amount);

      const access = await this.permissionsService.resolveUserAccess(actorId);
      await this.assertActorEligible(step, access.roleIds, actorId, row.escalated);

      const now = new Date();
      row.status = ApprovalStatus.Rejected;
      row.stepEnteredAt = null;
      row.set('updatedBy', new Types.ObjectId(actorId));

      await this.appendHistory(row, {
        stepNumber: step.stepNumber,
        action: ApprovalHistoryAction.Rejected,
        actorId,
        comment: dto.comment?.trim() ?? null,
        at: now,
        metadata: null,
        session,
      });

      await row.save({ session });
      return createSuccessResponse(
        toPublicApprovalRequest(row),
        'Approval request rejected',
      );
    });
  }

  async returnForCorrection(
    projectId: string,
    id: string,
    actorId: string,
    dto: ApprovalActionDto = {},
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'approve',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (row.status !== ApprovalStatus.Pending) {
        throw new BadRequestException('Only pending requests can be returned');
      }

      const workflow = await this.requireWorkflowById(
        String(row.workflowId),
        session,
      );
      this.assertNotSelfApprove(row, workflow.allowSelfApprove, actorId);

      const step = this.requireCurrentStep(workflow.steps, row);
      this.assertAmountWithinStep(step, row.amount);

      const access = await this.permissionsService.resolveUserAccess(actorId);
      await this.assertActorEligible(step, access.roleIds, actorId, row.escalated);

      const now = new Date();
      row.status = ApprovalStatus.Returned;
      row.currentStep = 0;
      row.stepEnteredAt = null;
      row.escalated = false;
      if (dto.comment?.trim()) {
        row.reason = dto.comment.trim();
      }
      row.set('updatedBy', new Types.ObjectId(actorId));

      await this.appendHistory(row, {
        stepNumber: step.stepNumber,
        action: ApprovalHistoryAction.Returned,
        actorId,
        comment: dto.comment?.trim() ?? null,
        at: now,
        metadata: null,
        session,
      });

      await row.save({ session });
      return createSuccessResponse(
        toPublicApprovalRequest(row),
        'Returned for correction',
      );
    });
  }

  async cancel(
    projectId: string,
    id: string,
    actorId: string,
    dto: CancelApprovalDto = {},
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'update',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (
        ![
          ApprovalStatus.Draft,
          ApprovalStatus.Pending,
          ApprovalStatus.Returned,
        ].includes(row.status)
      ) {
        throw new BadRequestException(
          'Only draft, pending, or returned requests can be cancelled',
        );
      }

      const isRequester = String(row.requestedBy) === actorId;
      if (!isRequester) {
        const access = await this.permissionsService.resolveUserAccess(actorId);
        if (
          !access.bypassPermissions &&
          !access.permissions.includes('approval.cancel')
        ) {
          throw new ForbiddenException(
            'Only the requester or a user with approval.cancel may cancel',
          );
        }
      }

      const now = new Date();
      const stepNumber = row.currentStep || 0;
      row.status = ApprovalStatus.Cancelled;
      row.stepEnteredAt = null;
      if (dto.reason?.trim()) {
        row.reason = dto.reason.trim();
      }
      row.set('updatedBy', new Types.ObjectId(actorId));

      await this.appendHistory(row, {
        stepNumber,
        action: ApprovalHistoryAction.Cancelled,
        actorId,
        comment: dto.reason?.trim() ?? null,
        at: now,
        metadata: null,
        session,
      });

      await row.save({ session });
      return createSuccessResponse(
        toPublicApprovalRequest(row),
        'Approval request cancelled',
      );
    });
  }

  async escalate(projectId: string, id: string, actorId: string) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'approve',
    );

    return this.databaseService.withTransaction(async (session) => {
      const row = await this.requireRequest(projectId, id, session);
      if (row.status !== ApprovalStatus.Pending) {
        throw new BadRequestException('Only pending requests can be escalated');
      }

      const workflow = await this.requireWorkflowById(
        String(row.workflowId),
        session,
      );
      const step = this.requireCurrentStep(workflow.steps, row);

      if (!step.escalationHours || !step.fallbackRole) {
        throw new BadRequestException(
          'Current step has no escalation hours / fallback role configured',
        );
      }
      if (!row.stepEnteredAt) {
        throw new BadRequestException('Step entry time is missing');
      }

      const dueAt = new Date(
        row.stepEnteredAt.getTime() + step.escalationHours * 60 * 60 * 1000,
      );
      const now = new Date();
      if (now < dueAt) {
        throw new BadRequestException(
          `Escalation not due until ${dueAt.toISOString()}`,
        );
      }
      if (row.escalated) {
        throw new ConflictException('Request is already escalated for this step');
      }

      row.escalated = true;
      row.set('updatedBy', new Types.ObjectId(actorId));

      await this.appendHistory(row, {
        stepNumber: step.stepNumber,
        action: ApprovalHistoryAction.Escalated,
        actorId,
        comment: null,
        at: now,
        metadata: {
          fallbackRole: String(step.fallbackRole),
          escalationHours: step.escalationHours,
          dueAt: dueAt.toISOString(),
        },
        session,
      });

      await row.save({ session });
      return createSuccessResponse(
        toPublicApprovalRequest(row),
        'Approval escalated to fallback role',
      );
    });
  }

  async getById(projectId: string, id: string, actorId: string) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'read',
    );
    const row = await this.requireRequest(projectId, id);
    return createSuccessResponse(toPublicApprovalRequest(row));
  }

  async list(
    projectId: string,
    actorId: string,
    query: PaginationQueryDto & {
      status?: ApprovalStatus;
      module?: string;
      entityType?: string;
    },
  ) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'read',
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ApprovalRequest> = {
      projectId: new Types.ObjectId(projectId),
    };
    if (query.status) filter.status = query.status;
    if (query.module) filter.module = query.module.trim().toLowerCase();
    if (query.entityType) {
      filter.entityType = query.entityType.trim().toLowerCase();
    }

    const sort: Record<string, SortOrder> = { createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicApprovalRequest(r)),
      'Approval requests',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getTimeline(projectId: string, id: string, actorId: string) {
    await this.projectAccessService.assertCanAccessProject(
      actorId,
      projectId,
      'read',
    );
    const row = await this.requireRequest(projectId, id);
    const events = await this.historyModel
      .find({ approvalRequestId: row._id })
      .sort({ at: 1, _id: 1 })
      .lean()
      .exec();

    const timeline: PublicTimelineEntry[] = events.map((e) => ({
      id: String(e._id),
      approvalRequestId: String(e.approvalRequestId),
      approvalCode: e.approvalCode,
      stepNumber: e.stepNumber,
      action: e.action,
      actorId: String(e.actorId),
      comment: e.comment ?? null,
      metadata: e.metadata ?? null,
      at: e.at,
    }));

    return createSuccessResponse(
      {
        approval: toPublicApprovalRequest(row),
        timeline,
      },
      'Approval timeline',
    );
  }

  // ─── internals ───────────────────────────────────────────────────────────

  private assertValidSteps(
    steps: UpsertApprovalWorkflowDto['steps'],
  ): void {
    const numbers = steps.map((s) => s.stepNumber);
    if (new Set(numbers).size !== numbers.length) {
      throw new BadRequestException('Step numbers must be unique');
    }
    for (const step of steps) {
      const roles = step.roleIds?.length ?? 0;
      const users = step.specificUserIds?.length ?? 0;
      if (roles + users === 0) {
        throw new BadRequestException(
          `Step ${step.stepNumber} needs at least one roleId or specificUserId`,
        );
      }
      if (
        step.maximumAmount != null &&
        step.minimumAmount != null &&
        step.maximumAmount < step.minimumAmount
      ) {
        throw new BadRequestException(
          `Step ${step.stepNumber} maximumAmount must be >= minimumAmount`,
        );
      }
    }
  }

  private normalizeSteps(
    steps: UpsertApprovalWorkflowDto['steps'],
  ): ApprovalStepConfig[] {
    return [...steps]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((s) => ({
        stepNumber: s.stepNumber,
        roleIds: (s.roleIds ?? []).map((id) => new Types.ObjectId(id)),
        specificUserIds: (s.specificUserIds ?? []).map(
          (id) => new Types.ObjectId(id),
        ),
        minimumAmount: s.minimumAmount ?? 0,
        maximumAmount: s.maximumAmount ?? null,
        requiresAll: s.requiresAll ?? false,
        escalationHours: s.escalationHours ?? null,
        fallbackRole: s.fallbackRole
          ? new Types.ObjectId(s.fallbackRole)
          : null,
      }));
  }

  private stepApplies(step: ApprovalStepConfig, amount: number): boolean {
    const min = step.minimumAmount ?? 0;
    const max = step.maximumAmount;
    if (amount < min) return false;
    if (max != null && amount > max) return false;
    return true;
  }

  private assertAmountHasApplicableSteps(
    steps: ApprovalStepConfig[],
    amount: number,
  ): void {
    if (!steps.some((s) => this.stepApplies(s, amount))) {
      throw new BadRequestException(
        'No approval step applies to this amount',
      );
    }
  }

  private firstApplicableStep(
    steps: ApprovalStepConfig[],
    amount: number,
  ): ApprovalStepConfig | null {
    return (
      [...steps]
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .find((s) => this.stepApplies(s, amount)) ?? null
    );
  }

  private nextApplicableStep(
    steps: ApprovalStepConfig[],
    afterStepNumber: number,
    amount: number,
  ): ApprovalStepConfig | null {
    return (
      [...steps]
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .find(
          (s) => s.stepNumber > afterStepNumber && this.stepApplies(s, amount),
        ) ?? null
    );
  }

  private requireCurrentStep(
    steps: ApprovalStepConfig[],
    row: ApprovalRequest & { currentStep: number; amount: number },
  ): ApprovalStepConfig {
    const step = steps.find((s) => s.stepNumber === row.currentStep);
    if (!step) {
      throw new BadRequestException('Current approval step is not configured');
    }
    return step;
  }

  private assertAmountWithinStep(step: ApprovalStepConfig, amount: number) {
    if (!this.stepApplies(step, amount)) {
      throw new ForbiddenException(
        'Approval amount is outside the current step limits',
      );
    }
  }

  private assertNotSelfApprove(
    row: ApprovalRequest,
    allowSelfApprove: boolean,
    actorId: string,
  ) {
    if (!allowSelfApprove && String(row.requestedBy) === actorId) {
      throw new ForbiddenException(
        'Requester cannot act on their own approval request',
      );
    }
  }

  private async assertActorEligible(
    step: ApprovalStepConfig,
    actorRoleIds: string[],
    actorId: string,
    escalated: boolean,
  ) {
    const specific = new Set((step.specificUserIds ?? []).map(String));
    if (specific.has(actorId)) return;

    const stepRoles = new Set((step.roleIds ?? []).map(String));
    if (actorRoleIds.some((r) => stepRoles.has(r))) return;

    if (escalated && step.fallbackRole) {
      if (actorRoleIds.includes(String(step.fallbackRole))) return;
    }

    throw new ForbiddenException(
      'You are not an eligible approver for this step',
    );
  }

  /**
   * requiresAll=false → any one eligible approval completes the step
   * requiresAll=true + specificUserIds → all listed users must approve
   * requiresAll=true + only roleIds → one distinct approval per role
   */
  private isStepComplete(
    step: ApprovalStepConfig,
    approverIds: string[],
    _latestActorAccess: { roleIds: string[] },
  ): boolean {
    const unique = [...new Set(approverIds)];
    if (!step.requiresAll) {
      return unique.length >= 1;
    }

    const specific = (step.specificUserIds ?? []).map(String);
    if (specific.length > 0) {
      return specific.every((uid) => unique.includes(uid));
    }

    const roles = (step.roleIds ?? []).map(String);
    if (roles.length > 0) {
      return unique.length >= roles.length;
    }

    return unique.length >= 1;
  }

  private async appendHistory(
    row: ApprovalRequest & { _id: Types.ObjectId; approvalCode: string },
    input: {
      stepNumber: number;
      action: ApprovalHistoryAction;
      actorId: string;
      comment: string | null;
      at: Date;
      metadata: Record<string, unknown> | null;
      session?: ClientSession | null;
    },
  ) {
    const [event] = await this.historyModel.create(
      [
        {
          approvalRequestId: row._id,
          approvalCode: row.approvalCode,
          stepNumber: input.stepNumber,
          action: input.action,
          actorId: new Types.ObjectId(input.actorId),
          comment: input.comment,
          metadata: input.metadata,
          at: input.at,
        },
      ],
      { session: input.session ?? undefined },
    );

    row.approvalHistory.push({
      historyId: event._id as Types.ObjectId,
      stepNumber: input.stepNumber,
      action: input.action,
      actorId: new Types.ObjectId(input.actorId),
      comment: input.comment,
      at: input.at,
    });
  }

  private async requireActiveWorkflow(module: string, entityType: string) {
    const workflow = await this.workflowModel
      .findOne({
        module: module.trim().toLowerCase(),
        entityType: entityType.trim().toLowerCase(),
        isActive: true,
      })
      .exec();
    if (!workflow) {
      throw new NotFoundException(
        `No active approval workflow for ${module}/${entityType}`,
      );
    }
    return workflow;
  }

  private async requireWorkflowById(
    id: string,
    session?: ClientSession | null,
  ) {
    const q = this.workflowModel.findById(id);
    if (session) q.session(session);
    const workflow = await q.exec();
    if (!workflow || !workflow.isActive) {
      throw new NotFoundException('Approval workflow not found');
    }
    return workflow;
  }

  private async requireRequest(
    projectId: string,
    id: string,
    session?: ClientSession | null,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Approval request not found');
    }
    const q = this.requestModel.findOne({
      _id: new Types.ObjectId(id),
      projectId: new Types.ObjectId(projectId),
    });
    if (session) q.session(session);
    const row = await q.exec();
    if (!row) {
      throw new NotFoundException('Approval request not found');
    }
    return row;
  }
}
