import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { Role, RoleStatus } from '../rbac/schemas/role.schema';
import {
  PURCHASE_ORDER_APPROVAL_ENTITY,
  PURCHASE_ORDER_APPROVAL_MODULE,
} from './purchase-orders.service';

@Injectable()
export class PurchaseOrdersSeedService implements OnModuleInit {
  private readonly logger = new Logger(PurchaseOrdersSeedService.name);

  constructor(
    private readonly approvalsService: ApprovalsService,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureApprovalWorkflow();
    } catch (error) {
      this.logger.warn(
        `Purchase order approval workflow seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Idempotent: Purchase Manager → Finance Manager */
  async ensureApprovalWorkflow(): Promise<void> {
    const purchase = await this.roleModel
      .findOne({
        code: { $in: ['PURCHASE_MANAGER', 'PROJECT_MANAGER'] },
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

    if (!purchase || !finance) {
      this.logger.warn(
        'PURCHASE_/FINANCE_* roles missing — purchase order approval workflow not seeded',
      );
      return;
    }

    await this.approvalsService.upsertWorkflow(
      {
        module: PURCHASE_ORDER_APPROVAL_MODULE,
        entityType: PURCHASE_ORDER_APPROVAL_ENTITY,
        name: 'Purchase order approval',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [String(purchase._id)],
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
      String(purchase._id),
    );
  }
}
