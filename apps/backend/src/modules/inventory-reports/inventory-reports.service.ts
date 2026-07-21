import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { MaterialStockTransaction } from '../material-master/schemas/material-stock-transaction.schema';
import { MaterialStockBalance } from '../stock-ledger/schemas/material-stock-balance.schema';
import { CostLayer } from '../inventory-costing/schemas/cost-layer.schema';
import { toPublicStockLedgerEntry } from '../stock-ledger/stock-ledger.mapper';

@Injectable()
export class InventoryReportsService {
  constructor(
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(MaterialStockBalance.name)
    private readonly balanceModel: Model<MaterialStockBalance>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(CostLayer.name)
    private readonly costLayerModel: Model<CostLayer>,
  ) {}

  async stockLedger(input: {
    projectId: string;
    materialId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    this.assertProject(input.projectId);
    const filter: Record<string, unknown> = {
      projectId: new Types.ObjectId(input.projectId),
    };
    if (input.materialId) {
      filter.materialId = new Types.ObjectId(input.materialId);
    }
    if (input.from || input.to) {
      filter.transactionDate = {};
      if (input.from) {
        (filter.transactionDate as Record<string, Date>).$gte = new Date(
          input.from,
        );
      }
      if (input.to) {
        (filter.transactionDate as Record<string, Date>).$lte = new Date(
          input.to,
        );
      }
    }
    const rows = await this.ledgerModel
      .find(filter)
      .sort({ transactionDate: 1, createdAt: 1 })
      .limit(input.limit ?? 500)
      .exec();
    return createSuccessResponse(
      rows.map((r) => toPublicStockLedgerEntry(r)),
      'Stock ledger report',
    );
  }

  async binCard(input: { projectId: string; materialId: string; location?: string }) {
    this.assertProject(input.projectId);
    if (!Types.ObjectId.isValid(input.materialId)) {
      throw new BadRequestException('Invalid materialId');
    }
    const filter: Record<string, unknown> = {
      projectId: new Types.ObjectId(input.projectId),
      materialId: new Types.ObjectId(input.materialId),
    };
    if (input.location !== undefined) {
      filter.location = (input.location ?? '').trim() || null;
    }
    const rows = await this.ledgerModel
      .find(filter)
      .sort({ transactionDate: 1, createdAt: 1 })
      .limit(1000)
      .exec();
    return createSuccessResponse(
      rows.map((r) => ({
        ...toPublicStockLedgerEntry(r),
        runningQty: r.afterQty,
      })),
      'Bin card report',
    );
  }

  async valuation(projectId: string) {
    this.assertProject(projectId);
    const layers = await this.costLayerModel
      .find({
        projectId: new Types.ObjectId(projectId),
        remainingQty: { $gt: 0 },
      })
      .lean()
      .exec();
    const byMaterial = new Map<
      string,
      { qty: number; value: number; unitCost: number }
    >();
    for (const layer of layers) {
      const key = String(layer.materialId);
      const cur = byMaterial.get(key) ?? { qty: 0, value: 0, unitCost: 0 };
      cur.qty += layer.remainingQty;
      cur.value += layer.remainingQty * layer.unitCost;
      byMaterial.set(key, cur);
    }
    const materials = await this.materialModel
      .find({
        _id: {
          $in: [...byMaterial.keys()].map((id) => new Types.ObjectId(id)),
        },
      })
      .lean()
      .exec();
    const materialMap = new Map(materials.map((m) => [String(m._id), m]));
    const lines = [...byMaterial.entries()].map(([materialId, v]) => {
      const m = materialMap.get(materialId);
      return {
        materialId,
        materialCode: m?.materialCode ?? null,
        name: m?.name ?? null,
        quantity: v.qty,
        value: v.value,
        avgUnitCost: v.qty > 0 ? v.value / v.qty : 0,
      };
    });
    const totalValue = lines.reduce((s, l) => s + l.value, 0);
    return createSuccessResponse(
      { projectId, totalValue, lines },
      'Valuation report',
    );
  }

  async abcAnalysis(projectId: string) {
    this.assertProject(projectId);
    const valuation = await this.valuation(projectId);
    const lines = [...(valuation.data?.lines ?? [])].sort(
      (a, b) => b.value - a.value,
    );
    const total = lines.reduce((s, l) => s + l.value, 0) || 1;
    let cumulative = 0;
    const classified = lines.map((line) => {
      cumulative += line.value;
      const pct = cumulative / total;
      const abc = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C';
      return { ...line, cumulativePct: pct, abc };
    });
    return createSuccessResponse(
      { projectId, lines: classified },
      'ABC analysis report',
    );
  }

  async ageing(projectId: string) {
    this.assertProject(projectId);
    const layers = await this.costLayerModel
      .find({
        projectId: new Types.ObjectId(projectId),
        remainingQty: { $gt: 0 },
      })
      .lean()
      .exec();
    const now = Date.now();
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };
    const lines = layers.map((l) => {
      const days = Math.floor(
        (now - new Date(l.receivedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      const bucket =
        days <= 30
          ? '0-30'
          : days <= 60
            ? '31-60'
            : days <= 90
              ? '61-90'
              : '90+';
      buckets[bucket] += l.remainingQty * l.unitCost;
      return {
        materialId: String(l.materialId),
        location: l.location,
        remainingQty: l.remainingQty,
        unitCost: l.unitCost,
        value: l.remainingQty * l.unitCost,
        ageDays: days,
        bucket,
      };
    });
    return createSuccessResponse(
      { projectId, buckets, lines },
      'Ageing report',
    );
  }

  async reorder(projectId: string) {
    this.assertProject(projectId);
    const balances = await this.balanceModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
    const materials = await this.materialModel
      .find({ status: MaterialStatus.Active })
      .lean()
      .exec();
    const balMap = new Map(
      balances.map((b) => [
        `${String(b.materialId)}|${b.location}`,
        b.quantityInBaseUnit,
      ]),
    );
    const lines = materials
      .map((m) => {
        const qty = [...balMap.entries()]
          .filter(([k]) => k.startsWith(`${String(m._id)}|`))
          .reduce((s, [, q]) => s + q, 0);
        return {
          materialId: String(m._id),
          materialCode: m.materialCode,
          name: m.name,
          onHand: qty,
          reorderLevel: m.reorderLevel ?? 0,
          minimumStock: m.minimumStock ?? 0,
          maximumStock: m.maximumStock ?? 0,
          suggestedOrder: Math.max(0, (m.maximumStock ?? 0) - qty),
        };
      })
      .filter((l) => l.onHand <= l.reorderLevel);
    return createSuccessResponse(
      { projectId, lines },
      'Reorder report',
    );
  }

  async deadStock(projectId: string, days = 90) {
    this.assertProject(projectId);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const balances = await this.balanceModel
      .find({
        projectId: new Types.ObjectId(projectId),
        quantityInBaseUnit: { $gt: 0 },
      })
      .lean()
      .exec();
    const lines = [];
    for (const bal of balances) {
      const recent = await this.ledgerModel
        .countDocuments({
          projectId: bal.projectId,
          materialId: bal.materialId,
          location: bal.location || null,
          transactionDate: { $gte: since },
          quantityOut: { $gt: 0 },
        })
        .exec();
      if (recent === 0) {
        const material = await this.materialModel
          .findById(bal.materialId)
          .lean()
          .exec();
        lines.push({
          materialId: String(bal.materialId),
          materialCode: material?.materialCode ?? null,
          name: material?.name ?? null,
          location: bal.location,
          onHand: bal.quantityInBaseUnit,
          idleDays: days,
        });
      }
    }
    return createSuccessResponse(
      { projectId, days, lines },
      'Dead stock report',
    );
  }

  async warehouseSummary(projectId: string) {
    this.assertProject(projectId);
    const rows = await this.balanceModel
      .aggregate([
        { $match: { projectId: new Types.ObjectId(projectId) } },
        {
          $group: {
            _id: '$location',
            skuCount: { $sum: 1 },
            totalQty: { $sum: '$quantityInBaseUnit' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return createSuccessResponse(
      {
        projectId,
        locations: rows.map((r) => ({
          location: r._id || '(default)',
          skuCount: r.skuCount,
          totalQty: r.totalQty,
        })),
      },
      'Warehouse summary report',
    );
  }

  async consumption(projectId: string, from?: string, to?: string) {
    this.assertProject(projectId);
    const match: Record<string, unknown> = {
      projectId: new Types.ObjectId(projectId),
      quantityOut: { $gt: 0 },
    };
    if (from || to) {
      match.transactionDate = {};
      if (from) {
        (match.transactionDate as Record<string, Date>).$gte = new Date(from);
      }
      if (to) {
        (match.transactionDate as Record<string, Date>).$lte = new Date(to);
      }
    }
    const rows = await this.ledgerModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$materialId',
            quantityOut: { $sum: '$quantityOut' },
            value: { $sum: '$totalValue' },
          },
        },
      ])
      .exec();
    return createSuccessResponse(
      {
        projectId,
        lines: rows.map((r) => ({
          materialId: String(r._id),
          quantityOut: r.quantityOut,
          value: r.value,
        })),
      },
      'Consumption report',
    );
  }

  private assertProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
  }
}
