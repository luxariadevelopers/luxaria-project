import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import { MaterialStockBalance } from '../stock-ledger/schemas/material-stock-balance.schema';
import { StockReservation } from '../stock-reservations/schemas/stock-reservation.schema';
import { StockReservationStatus } from '../stock-reservations/schemas/stock-reservation.schema';
import { CostLayer } from '../inventory-costing/schemas/cost-layer.schema';

@Injectable()
export class InventoryDashboardService {
  constructor(
    @InjectModel(MaterialStockBalance.name)
    private readonly balanceModel: Model<MaterialStockBalance>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(StockReservation.name)
    private readonly reservationModel: Model<StockReservation>,
    @InjectModel(CostLayer.name)
    private readonly costLayerModel: Model<CostLayer>,
  ) {}

  async getSummary(projectId: string) {
    const pid = new Types.ObjectId(projectId);
    const balances = await this.balanceModel
      .find({ projectId: pid, quantityInBaseUnit: { $gt: 0 } })
      .lean()
      .exec();

    const materialIds = [...new Set(balances.map((b) => String(b.materialId)))];
    const materials = await this.materialModel
      .find({
        _id: { $in: materialIds.map((id) => new Types.ObjectId(id)) },
        status: MaterialStatus.Active,
      })
      .lean()
      .exec();
    const materialMap = new Map(materials.map((m) => [String(m._id), m]));

    const layers = await this.costLayerModel
      .find({ projectId: pid, remainingQty: { $gt: 0 } })
      .lean()
      .exec();
    const stockValue = layers.reduce(
      (s, l) => s + l.remainingQty * l.unitCost,
      0,
    );

    let criticalStock = 0;
    let reorderItems = 0;
    let slowMoving = 0;
    let deadStock = 0;
    let fastMoving = 0;

    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    for (const bal of balances) {
      const material = materialMap.get(String(bal.materialId));
      if (!material) continue;
      if (bal.quantityInBaseUnit <= (material.minimumStock ?? 0)) {
        criticalStock += 1;
      }
      if (bal.quantityInBaseUnit <= (material.reorderLevel ?? 0)) {
        reorderItems += 1;
      }

      const recentOut = await this.ledgerModel
        .countDocuments({
          projectId: pid,
          materialId: bal.materialId,
          transactionDate: { $gte: since30 },
          quantityOut: { $gt: 0 },
        })
        .exec();
      const midOut = await this.ledgerModel
        .countDocuments({
          projectId: pid,
          materialId: bal.materialId,
          transactionDate: { $gte: since90 },
          quantityOut: { $gt: 0 },
        })
        .exec();

      if (recentOut >= 5) fastMoving += 1;
      else if (midOut === 0) deadStock += 1;
      else if (recentOut === 0) slowMoving += 1;
    }

    const reservedCount = await this.reservationModel
      .countDocuments({
        projectId: pid,
        status: StockReservationStatus.Active,
      })
      .exec();

    const last30Issues = await this.ledgerModel
      .aggregate([
        {
          $match: {
            projectId: pid,
            transactionType: StockTransactionType.MaterialIssue,
            transactionDate: { $gte: since30 },
          },
        },
        { $group: { _id: null, qty: { $sum: '$quantityOut' }, value: { $sum: '$totalValue' } } },
      ])
      .exec();

    const varianceAdjustments = await this.ledgerModel
      .countDocuments({
        projectId: pid,
        transactionType: {
          $in: [
            StockTransactionType.Adjustment,
            StockTransactionType.PhysicalCount,
            StockTransactionType.CycleCount,
          ],
        },
        transactionDate: { $gte: since30 },
      })
      .exec();

    return createSuccessResponse(
      {
        projectId,
        stockValue,
        skuWithStock: balances.length,
        criticalStock,
        reorderItems,
        slowMoving,
        deadStock,
        fastMoving,
        activeReservations: reservedCount,
        materialConsumption30d: {
          quantity: last30Issues[0]?.qty ?? 0,
          value: last30Issues[0]?.value ?? 0,
        },
        varianceAdjustments30d: varianceAdjustments,
        warehouseUtilization: null,
      },
      'Inventory dashboard summary',
    );
  }
}
