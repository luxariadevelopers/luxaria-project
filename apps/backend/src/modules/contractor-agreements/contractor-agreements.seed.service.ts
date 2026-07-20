import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { Role, RoleStatus } from '../rbac/schemas/role.schema';
import {
  CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
  CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
} from './contractor-agreements.constants';

@Injectable()
export class ContractorAgreementsSeedService implements OnModuleInit {
  private readonly logger = new Logger(ContractorAgreementsSeedService.name);

  constructor(
    private readonly approvalsService: ApprovalsService,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureApprovalWorkflow();
    } catch (error) {
      this.logger.warn(
        `Contractor agreement approval workflow seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Idempotent: Project Manager → Finance Manager */
  async ensureApprovalWorkflow(): Promise<void> {
    const project = await this.roleModel
      .findOne({
        code: { $in: ['PROJECT_MANAGER', 'SITE_ENGINEER'] },
        status: RoleStatus.Active,
      })
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

    if (!project || !finance) {
      this.logger.warn(
        'PROJECT_/FINANCE_* roles missing — contractor agreement approval workflow not seeded',
      );
      return;
    }

    await this.approvalsService.upsertWorkflow(
      {
        module: CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
        entityType: CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
        name: 'Contractor agreement approval',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [String(project._id)],
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
      String(project._id),
    );
  }
}
