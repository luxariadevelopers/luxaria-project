import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { toPublicPurchaseOrder } from '../purchase-orders/purchase-orders.mapper';
import { Rfq, RfqStatus } from '../rfq/schemas/rfq.schema';
import { toPublicRfq } from '../rfq/rfq.mapper';
import { VendorQuotationsService } from '../vendor-quotations/vendor-quotations.service';
import { Vendor } from '../vendors/schemas/vendor.schema';
import type { CreateVendorPortalQuotationDto } from './dto/vendor-portal.dto';

@Injectable()
export class VendorPortalService {
  constructor(
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(Rfq.name) private readonly rfqModel: Model<Rfq>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrder>,
    private readonly vendorQuotationsService: VendorQuotationsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  async requireLinkedVendor(actorId: string) {
    if (!Types.ObjectId.isValid(actorId)) {
      throw new ForbiddenException('Vendor portal access denied');
    }
    const vendor = await this.vendorModel
      .findOne({ userId: new Types.ObjectId(actorId) })
      .exec();
    if (!vendor) {
      throw new ForbiddenException(
        'No vendor profile linked to this user (Vendor.userId)',
      );
    }
    return vendor;
  }

  async listIssuedRfqs(actorId: string) {
    const vendor = await this.requireLinkedVendor(actorId);
    const rows = await this.rfqModel
      .find({
        status: RfqStatus.Issued,
        vendorIds: vendor._id,
      })
      .sort({ issuedAt: -1, createdAt: -1 })
      .exec();
    return createSuccessResponse(
      rows.map((r) => toPublicRfq(r)),
      'Issued RFQs for vendor',
    );
  }

  async createQuotationForRfq(
    rfqId: string,
    dto: CreateVendorPortalQuotationDto,
    actorId: string,
  ) {
    const vendor = await this.requireLinkedVendor(actorId);
    if (!Types.ObjectId.isValid(rfqId)) {
      throw new NotFoundException('RFQ not found');
    }
    const rfq = await this.rfqModel.findById(rfqId).exec();
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.status !== RfqStatus.Issued) {
      throw new ForbiddenException('RFQ is not open for quotations');
    }
    if (!rfq.vendorIds.some((id) => String(id) === String(vendor._id))) {
      throw new ForbiddenException('Vendor is not invited on this RFQ');
    }

    return this.vendorQuotationsService.create(
      {
        purchaseRequestId: String(rfq.purchaseRequestId),
        rfqId: String(rfq._id),
        vendorId: String(vendor._id),
        quotationDate: dto.quotationDate,
        validityDate: dto.validityDate,
        deliveryDays: dto.deliveryDays,
        paymentTerms: dto.paymentTerms,
        freight: dto.freight,
        taxes: dto.taxes,
        discount: dto.discount,
        items: dto.items,
      },
      actorId,
    );
  }

  async listPurchaseOrders(actorId: string) {
    const vendor = await this.requireLinkedVendor(actorId);
    const rows = await this.purchaseOrderModel
      .find({
        vendorId: vendor._id,
        status: {
          $in: [
            PurchaseOrderStatus.Issued,
            PurchaseOrderStatus.PartiallyReceived,
            PurchaseOrderStatus.FullyReceived,
          ],
        },
      })
      .sort({ issuedAt: -1, createdAt: -1 })
      .exec();
    return createSuccessResponse(
      rows.map((r) => toPublicPurchaseOrder(r)),
      'Issued purchase orders for vendor',
    );
  }

  async acceptPurchaseOrder(poId: string, actorId: string) {
    const vendor = await this.requireLinkedVendor(actorId);
    return this.purchaseOrdersService.acceptByVendor(
      poId,
      String(vendor._id),
      actorId,
    );
  }
}
