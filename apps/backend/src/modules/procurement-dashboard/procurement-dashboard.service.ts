import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import {
  GoodsReceipt,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import { Rfq, RfqStatus } from '../rfq/schemas/rfq.schema';
import {
  VendorQuotation,
  VendorQuotationStatus,
} from '../vendor-quotations/schemas/vendor-quotation.schema';

export type ProcurementDashboardCounts = {
  pendingPr: number;
  pendingRfq: number;
  pendingQuotations: number;
  pendingApprovals: number;
  openPo: number;
  delayedPo: number;
  grnDraft: number;
  /** Placeholder until budget engine is wired for procurement. */
  budgetUtilization: number | null;
};

@Injectable()
export class ProcurementDashboardService {
  constructor(
    @InjectModel(PurchaseRequest.name)
    private readonly prModel: Model<PurchaseRequest>,
    @InjectModel(Rfq.name)
    private readonly rfqModel: Model<Rfq>,
    @InjectModel(VendorQuotation.name)
    private readonly quotationModel: Model<VendorQuotation>,
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async getDashboard(projectId: string | undefined, actorId: string) {
    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      await this.projectScope.assertProjectAccess(actorId, projectId, 'read', {
        resourceType: 'procurement-dashboard',
      });
    }

    let baseFilter: Record<string, unknown> = {};
    if (projectId) {
      baseFilter.projectId = new Types.ObjectId(projectId);
    }
    baseFilter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      baseFilter,
    );

    const now = new Date();
    const [
      pendingPr,
      pendingRfq,
      pendingQuotations,
      pendingApprovals,
      openPo,
      delayedPo,
      grnDraft,
    ] = await Promise.all([
      this.prModel.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            PurchaseRequestStatus.Draft,
            PurchaseRequestStatus.Submitted,
            PurchaseRequestStatus.Reviewed,
            PurchaseRequestStatus.Returned,
          ],
        },
      }),
      this.rfqModel.countDocuments({
        ...baseFilter,
        status: { $in: [RfqStatus.Draft, RfqStatus.Issued] },
      }),
      this.quotationModel.countDocuments({
        ...baseFilter,
        status: {
          $in: [VendorQuotationStatus.Draft, VendorQuotationStatus.Submitted],
        },
      }),
      this.prModel.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            PurchaseRequestStatus.Submitted,
            PurchaseRequestStatus.Reviewed,
          ],
        },
      }),
      this.poModel.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            PurchaseOrderStatus.Issued,
            PurchaseOrderStatus.PartiallyReceived,
            PurchaseOrderStatus.PendingApproval,
          ],
        },
      }),
      this.poModel.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            PurchaseOrderStatus.Issued,
            PurchaseOrderStatus.PartiallyReceived,
          ],
        },
        expectedDeliveryDate: { $lt: now },
      }),
      this.grnModel.countDocuments({
        ...baseFilter,
        status: GoodsReceiptStatus.Draft,
      }),
    ]);

    const data: ProcurementDashboardCounts = {
      pendingPr,
      pendingRfq,
      pendingQuotations,
      pendingApprovals,
      openPo,
      delayedPo,
      grnDraft,
      budgetUtilization: null,
    };

    return createSuccessResponse(data, 'Procurement dashboard');
  }
}
