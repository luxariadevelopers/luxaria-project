import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { Role, RoleStatus } from '../rbac/schemas/role.schema';
import {
  BOOKING_CANCELLATION_APPROVAL_ENTITY,
  BOOKING_CANCELLATION_APPROVAL_MODULE,
} from './booking-cancellations.service';

@Injectable()
export class BookingCancellationsSeedService implements OnModuleInit {
  private readonly logger = new Logger(BookingCancellationsSeedService.name);

  constructor(
    private readonly approvalsService: ApprovalsService,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureApprovalWorkflow();
    } catch (error) {
      this.logger.warn(
        `Booking cancellation approval workflow seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Idempotent: Sales Manager → Finance Manager */
  async ensureApprovalWorkflow(): Promise<void> {
    const sales = await this.roleModel
      .findOne({
        code: { $in: ['SALES_MANAGER', 'PROJECT_MANAGER'] },
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

    if (!sales || !finance) {
      this.logger.warn(
        'SALES_/FINANCE_* roles missing — booking cancellation approval workflow not seeded',
      );
      return;
    }

    await this.approvalsService.upsertWorkflow(
      {
        module: BOOKING_CANCELLATION_APPROVAL_MODULE,
        entityType: BOOKING_CANCELLATION_APPROVAL_ENTITY,
        name: 'Booking cancellation approval',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [String(sales._id)],
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
      String(sales._id),
    );
  }
}
