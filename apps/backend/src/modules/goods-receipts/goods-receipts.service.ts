import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import type { ApiResponseDto } from '../../common/dto/api-response.dto';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
  IdempotencyService,
} from '../../database/services/idempotency.service';
import { convertToBaseUnit } from '../material-master/materials.validation';
import { MaterialsService } from '../material-master/materials.service';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { DEFAULT_RECEIVE_TOLERANCE_PERCENT } from '../purchase-orders/purchase-orders.validation';
import type {
  CreateGoodsReceiptDto,
  ListGoodsReceiptsQueryDto,
  QualityAcceptGoodsReceiptDto,
  UpdateGoodsReceiptDto,
} from './dto/goods-receipt.dto';
import { toPublicGoodsReceipt } from './goods-receipts.mapper';
import type { PublicGoodsReceipt } from './goods-receipts.mapper';
import {
  assertGps,
  assertPhotos,
  assertQualityDecision,
  assertReceivedQuantities,
  mergePhotoIds,
  roundQty,
} from './goods-receipts.validation';
import {
  GoodsReceipt,
  GoodsReceiptStatus,
  type GoodsReceiptItem,
} from './schemas/goods-receipt.schema';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly materialsService: MaterialsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async create(
    dto: CreateGoodsReceiptDto,
    actorId: string,
    idempotencyKey?: string | null,
  ) {
    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      actorId,
    });

    if (idempotencyKey) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicGoodsReceipt>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.grnModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A goods receipt with this idempotency key already exists',
          );
        }
      }

      const po = await this.requireReceivablePo(dto.purchaseOrderId);
      if (String(po.projectId) !== dto.projectId) {
        throw new BadRequestException(
          'projectId must match the purchase order project',
        );
      }

      const vendorId = dto.vendorId ?? String(po.vendorId);
      if (vendorId !== String(po.vendorId)) {
        throw new BadRequestException(
          'vendorId must match the purchase order vendor',
        );
      }

      const photos = mergePhotoIds({
        photos: dto.photos,
        attachments: dto.attachments,
        photoFields: dto as unknown as Record<string, unknown>,
      });
      assertPhotos(photos);
      assertGps(dto.latitude, dto.longitude);

      const challanDocument =
        dto.challanDocument?.trim() ||
        dto.attachments?.challanDocument?.trim() ||
        null;
      const weighbridgeDocument =
        dto.weighbridgeDocument?.trim() ||
        dto.attachments?.weighbridgeDocument?.trim() ||
        null;

      const items = await this.buildItems(dto.items, po);
      const receivedDate = this.parseDate(dto.receivedDate, 'receivedDate');

      const grnNumber = await this.numberingService.nextCode(
        NumberEntityType.GOODS_RECEIPT,
        {
          asOf: receivedDate,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const status = dto.submit
        ? GoodsReceiptStatus.Submitted
        : GoodsReceiptStatus.Draft;

      const row = await this.grnModel.create({
        grnNumber,
        projectId: new Types.ObjectId(dto.projectId),
        purchaseOrderId: po._id,
        vendorId: new Types.ObjectId(vendorId),
        deliveryChallanNumber: dto.deliveryChallanNumber?.trim() || null,
        vehicleNumber: dto.vehicleNumber?.trim() || null,
        receivedDate,
        receivedBy: new Types.ObjectId(actorId),
        items,
        photos,
        challanDocument,
        weighbridgeDocument,
        latitude: dto.latitude,
        longitude: dto.longitude,
        status,
        idempotencyKey: idempotencyKey?.trim() || null,
        clientTransactionId: dto.clientTransactionId?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      const response = createSuccessResponse(
        toPublicGoodsReceipt(row),
        status === GoodsReceiptStatus.Submitted
          ? 'Goods receipt submitted'
          : 'Goods receipt created as draft',
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateGoodsReceiptDto, actorId: string) {
    const row = await this.requireGrn(id);
    if (row.status !== GoodsReceiptStatus.Draft) {
      throw new BadRequestException('Only draft GRNs can be updated');
    }

    if (dto.deliveryChallanNumber !== undefined) {
      row.deliveryChallanNumber = dto.deliveryChallanNumber?.trim() || null;
    }
    if (dto.vehicleNumber !== undefined) {
      row.vehicleNumber = dto.vehicleNumber?.trim() || null;
    }
    if (dto.receivedDate !== undefined) {
      row.receivedDate = this.parseDate(dto.receivedDate, 'receivedDate');
    }
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const lat = dto.latitude ?? row.latitude;
      const lng = dto.longitude ?? row.longitude;
      assertGps(lat, lng);
      row.latitude = lat;
      row.longitude = lng;
    }
    if (dto.photos !== undefined || dto.attachments) {
      const photos = mergePhotoIds({
        photos: dto.photos ?? row.photos,
        attachments: dto.attachments,
      });
      assertPhotos(photos);
      row.photos = photos;
    }
    if (dto.challanDocument !== undefined) {
      row.challanDocument = dto.challanDocument?.trim() || null;
    }
    if (dto.weighbridgeDocument !== undefined) {
      row.weighbridgeDocument = dto.weighbridgeDocument?.trim() || null;
    }
    if (dto.items !== undefined) {
      const po = await this.requireReceivablePo(String(row.purchaseOrderId));
      row.items = (await this.buildItems(dto.items, po)) as GoodsReceiptItem[];
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      'Goods receipt updated',
    );
  }

  async getById(id: string) {
    const row = await this.requireGrn(id);
    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      'Goods receipt fetched',
    );
  }

  async list(query: ListGoodsReceiptsQueryDto) {
    const filter: FilterQuery<GoodsReceipt> = {};
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.purchaseOrderId) {
      filter.purchaseOrderId = new Types.ObjectId(query.purchaseOrderId);
    }
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { grnNumber: { $regex: search, $options: 'i' } },
        { deliveryChallanNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.grnModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.grnModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicGoodsReceipt(item)),
      'Goods receipts fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireGrn(id);
    if (row.status !== GoodsReceiptStatus.Draft) {
      throw new BadRequestException('Only draft GRNs can be submitted');
    }
    assertPhotos(row.photos);
    assertGps(row.latitude, row.longitude);
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }
    row.status = GoodsReceiptStatus.Submitted;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      'Goods receipt submitted',
    );
  }

  async startQualityCheck(id: string, actorId: string) {
    const row = await this.requireGrn(id);
    if (row.status !== GoodsReceiptStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted GRNs can enter quality check',
      );
    }
    row.status = GoodsReceiptStatus.QualityCheck;
    row.qualityCheckedBy = new Types.ObjectId(actorId);
    row.qualityCheckedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      'Goods receipt moved to quality check',
    );
  }

  async accept(id: string, dto: QualityAcceptGoodsReceiptDto, actorId: string) {
    return this.applyInspectionResult(
      id,
      {
        items: dto.items,
        allowFullReject: false,
      },
      actorId,
    );
  }

  /**
   * Apply quality-inspection line decisions to a GRN.
   * Rejected quantities never become available stock (post uses acceptedQuantity only).
   */
  async applyInspectionResult(
    id: string,
    input: {
      items: QualityAcceptGoodsReceiptDto['items'];
      allowFullReject?: boolean;
      forceStatus?: GoodsReceiptStatus;
      hold?: boolean;
    },
    actorId: string,
  ) {
    const row = await this.requireGrn(id);
    if (
      row.status !== GoodsReceiptStatus.QualityCheck &&
      row.status !== GoodsReceiptStatus.Submitted
    ) {
      throw new BadRequestException(
        'Inspection result can only be applied to submitted or quality-check GRNs',
      );
    }

    if (row.status === GoodsReceiptStatus.Submitted) {
      row.status = GoodsReceiptStatus.QualityCheck;
    }

    if (input.hold) {
      row.qualityCheckedBy = new Types.ObjectId(actorId);
      row.qualityCheckedAt = new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
      return createSuccessResponse(
        toPublicGoodsReceipt(row),
        'Goods receipt held pending further inspection',
      );
    }

    const byId = new Map(row.items.map((i) => [String(i._id), i]));
    for (const lineInput of input.items) {
      const line = byId.get(lineInput.lineId);
      if (!line) {
        throw new BadRequestException(`Unknown GRN line ${lineInput.lineId}`);
      }
      assertQualityDecision({
        receivedQuantity: line.receivedQuantity,
        acceptedQuantity: lineInput.acceptedQuantity,
        rejectedQuantity: lineInput.rejectedQuantity,
        rejectionReason: lineInput.rejectionReason,
      });
      line.acceptedQuantity = roundQty(lineInput.acceptedQuantity);
      line.rejectedQuantity = roundQty(lineInput.rejectedQuantity);
      line.rejectionReason =
        lineInput.rejectedQuantity > 0
          ? lineInput.rejectionReason?.trim() || null
          : null;
    }

    for (const line of row.items) {
      if (line.acceptedQuantity == null) {
        line.acceptedQuantity = line.receivedQuantity;
        line.rejectedQuantity = 0;
        line.rejectionReason = null;
      }
    }

    const anyRejected = row.items.some((i) => (i.rejectedQuantity ?? 0) > 0);
    const anyAccepted = row.items.some((i) => (i.acceptedQuantity ?? 0) > 0);

    if (!anyAccepted && !input.allowFullReject) {
      throw new BadRequestException(
        'At least one line must have acceptedQuantity > 0',
      );
    }

    if (input.forceStatus) {
      row.status = input.forceStatus;
    } else if (!anyAccepted && anyRejected) {
      row.status = GoodsReceiptStatus.Rejected;
    } else if (anyRejected) {
      row.status = GoodsReceiptStatus.PartiallyAccepted;
    } else {
      row.status = GoodsReceiptStatus.Accepted;
    }

    row.qualityCheckedBy = new Types.ObjectId(actorId);
    row.qualityCheckedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      `Goods receipt ${row.status.replace(/_/g, ' ')}`,
    );
  }

  /**
   * Post GRN: increase stock for accepted qty only; update PO received balance.
   */
  async post(id: string, actorId: string, idempotencyKey?: string | null) {
    const row = await this.requireGrn(id);
    const postKey =
      idempotencyKey?.trim() || `grn-post:${String(row._id)}`;

    const requestHash = this.idempotencyService.hashRequest({
      grnId: String(row._id),
      action: 'post',
    });

    const begin = await this.idempotencyService.begin({
      key: postKey,
      scope: GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
      userId: actorId,
      requestHash,
    });
    if (begin.outcome === 'replay') {
      return begin.response as unknown as ApiResponseDto<PublicGoodsReceipt>;
    }

    try {
      if (
        row.status !== GoodsReceiptStatus.Accepted &&
        row.status !== GoodsReceiptStatus.PartiallyAccepted
      ) {
        throw new BadRequestException(
          'Only accepted or partially accepted GRNs can be posted',
        );
      }

      for (const item of row.items) {
        const accepted = item.acceptedQuantity ?? 0;
        if (accepted <= 0) continue;

        const material = await this.requireActiveMaterial(
          String(item.materialId),
        );
        const qtyInBase = convertToBaseUnit(
          accepted,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        );

        await this.materialsService.recordStockTransaction({
          materialId: String(item.materialId),
          quantityInBaseUnit: qtyInBase,
          referenceType: 'goods_receipt',
          referenceId: String(row._id),
          projectId: String(row.projectId),
          notes: `GRN ${row.grnNumber}`,
          actorId,
          transactionType: StockTransactionType.PurchaseReceipt,
        });
      }

      // Update PO balance with accepted quantities (usable goods)
      const poReceiptItems = row.items
        .filter(
          (i) =>
            i.purchaseOrderLineId &&
            (i.acceptedQuantity ?? 0) > 0,
        )
        .map((i) => ({
          lineId: String(i.purchaseOrderLineId),
          receivedQuantity: i.acceptedQuantity!,
        }));

      if (poReceiptItems.length > 0) {
        await this.purchaseOrdersService.recordReceipt(
          String(row.purchaseOrderId),
          { items: poReceiptItems },
          actorId,
        );
      }

      row.status = GoodsReceiptStatus.Posted;
      row.postedBy = new Types.ObjectId(actorId);
      row.postedAt = new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();

      const response = createSuccessResponse(
        toPublicGoodsReceipt(row),
        'Goods receipt posted; stock increased for accepted quantity',
      );

      await this.idempotencyService.complete(
        postKey,
        GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
        response as unknown as Record<string, unknown>,
      );

      return response;
    } catch (error) {
      await this.idempotencyService.fail(
        postKey,
        GOODS_RECEIPT_IDEMPOTENCY_SCOPE,
      );
      throw error;
    }
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireGrn(id);
    if (
      row.status === GoodsReceiptStatus.Posted ||
      row.status === GoodsReceiptStatus.Cancelled
    ) {
      throw new BadRequestException('Goods receipt cannot be cancelled');
    }
    row.status = GoodsReceiptStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicGoodsReceipt(row),
      'Goods receipt cancelled',
    );
  }

  private getReceiveTolerancePercent(): number {
    const value = this.configService.get('purchaseOrderReceiveTolerancePercent', {
      infer: true,
    });
    return Number.isFinite(value)
      ? Number(value)
      : DEFAULT_RECEIVE_TOLERANCE_PERCENT;
  }

  private async buildItems(
    inputs: CreateGoodsReceiptDto['items'],
    po: PurchaseOrder,
  ) {
    const tolerance = this.getReceiveTolerancePercent();
    const poLines = new Map(
      (po.items ?? []).map((line) => [String(line._id), line]),
    );
    const items: GoodsReceiptItem[] = [];

    for (const input of inputs) {
      const material = await this.requireActiveMaterial(input.materialId);
      let orderedQuantity = input.orderedQuantity;
      const purchaseOrderLineId: Types.ObjectId | null = input.purchaseOrderLineId
        ? new Types.ObjectId(input.purchaseOrderLineId)
        : null;

      if (input.purchaseOrderLineId) {
        const poLine = poLines.get(input.purchaseOrderLineId);
        if (!poLine) {
          throw new BadRequestException(
            `PO line ${input.purchaseOrderLineId} not found on purchase order`,
          );
        }
        if (String(poLine.materialId) !== input.materialId) {
          throw new BadRequestException(
            'materialId does not match the purchase order line',
          );
        }
        orderedQuantity = poLine.quantity;
        assertReceivedQuantities({
          orderedQuantity: poLine.quantity,
          receivedQuantity: input.receivedQuantity,
          // remaining capacity: ordered - already received on PO, with tolerance on ordered
          tolerancePercent: tolerance,
        });
        // Also check against remaining open qty + tolerance on remaining
        const already = poLine.receivedQuantity ?? 0;
        const open = Math.max(0, poLine.quantity - already);
        const maxNow = open + poLine.quantity * (tolerance / 100);
        if (input.receivedQuantity - maxNow > 1e-9) {
          throw new BadRequestException(
            `receivedQuantity exceeds open PO balance for ${poLine.materialCode ?? poLine.materialName}`,
          );
        }
      } else {
        assertReceivedQuantities({
          orderedQuantity,
          receivedQuantity: input.receivedQuantity,
          tolerancePercent: tolerance,
        });
      }

      items.push({
        materialId: material._id as Types.ObjectId,
        materialCode: material.materialCode,
        materialName: material.name,
        purchaseOrderLineId,
        orderedQuantity,
        receivedQuantity: roundQty(input.receivedQuantity),
        acceptedQuantity: null,
        rejectedQuantity: null,
        unit: input.unit,
        rejectionReason: null,
      });
    }

    return items;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async requireGrn(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid goods receipt id');
    }
    const row = await this.grnModel.findById(id).exec();
    if (!row) throw new NotFoundException('Goods receipt not found');
    return row;
  }

  private async requireReceivablePo(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchaseOrderId');
    }
    const po = await this.poModel.findById(id).exec();
    if (!po) throw new NotFoundException('Purchase order not found');
    if (
      po.status !== PurchaseOrderStatus.Issued &&
      po.status !== PurchaseOrderStatus.PartiallyReceived
    ) {
      throw new BadRequestException(
        'GRN requires an issued or partially received purchase order',
      );
    }
    return po;
  }

  private async requireActiveMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid materialId');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material is not active');
    }
    return material;
  }
}
