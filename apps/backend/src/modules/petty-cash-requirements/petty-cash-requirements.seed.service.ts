import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { Role, RoleStatus } from '../rbac/schemas/role.schema';
import {
  PETTY_CASH_APPROVAL_ENTITY,
  PETTY_CASH_APPROVAL_MODULE,
} from './petty-cash-requirements.service';

@Injectable()
export class PettyCashRequirementsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PettyCashRequirementsSeedService.name);

  constructor(
    private readonly approvalsService: ApprovalsService,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureApprovalWorkflow();
    } catch (error) {
      this.logger.warn(
        `Petty-cash approval workflow seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Idempotent two-step workflow: Project Manager → Finance Manager.
   */
  async ensureApprovalWorkflow(): Promise<void> {
    const pm = await this.roleModel
      .findOne({ code: 'PROJECT_MANAGER', status: RoleStatus.Active })
      .select('_id')
      .lean()
      .exec();
    const finance = await this.roleModel
      .findOne({
        code: { $in: ['FINANCE_MANAGER', 'FINANCE_DIRECTOR'] },
        status: RoleStatus.Active,
      })
      .select('_id')
      .lean()
      .exec();

    if (!pm || !finance) {
      this.logger.warn(
        'PROJECT_MANAGER / FINANCE_* roles missing — petty-cash approval workflow not seeded',
      );
      return;
    }

    // System actor id placeholder — upsertWorkflow only needs a valid ObjectId-like string for audit
    const systemActor = String(pm._id);

    await this.approvalsService.upsertWorkflow(
      {
        module: PETTY_CASH_APPROVAL_MODULE,
        entityType: PETTY_CASH_APPROVAL_ENTITY,
        name: 'Weekly petty-cash requirement',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [String(pm._id)],
            minimumAmount: 0,
            maximumAmount: null,
            requiresAll: false,
          },
          {
            stepNumber: 2,
            roleIds: [String(finance._id)],
            minimumAmount: 0,
            maximumAmount: null,
            requiresAll: false,
          },
        ],
      },
      systemActor,
    );

    this.logger.log('Petty-cash weekly requirement approval workflow ensured');
  }
}
