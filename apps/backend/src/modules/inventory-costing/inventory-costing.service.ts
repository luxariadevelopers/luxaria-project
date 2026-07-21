import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  InventoryCostingMethod,
} from '../material-master/schemas/material-stock-transaction.schema';
import { Project } from '../projects/schemas/project.schema';
import { CostLayer } from './schemas/cost-layer.schema';

export type CostApplyResult = {
  unitCost: number;
  totalValue: number;
  costingMethod: InventoryCostingMethod;
  costLayerIds: Types.ObjectId[];
};

@Injectable()
export class InventoryCostingService {
  constructor(
    @InjectModel(CostLayer.name)
    private readonly layerModel: Model<CostLayer>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async resolveMethod(projectId: string): Promise<InventoryCostingMethod> {
    const project = await this.projectModel.findById(projectId).lean().exec();
    const raw =
      (project as { settings?: { inventoryCostingMethod?: string } } | null)
        ?.settings?.inventoryCostingMethod ?? 'weighted_average';
    if (raw === InventoryCostingMethod.Fifo) {
      return InventoryCostingMethod.Fifo;
    }
    if (raw === InventoryCostingMethod.MovingAverage) {
      return InventoryCostingMethod.MovingAverage;
    }
    return InventoryCostingMethod.WeightedAverage;
  }

  /**
   * Apply costing for a signed base-unit movement.
   * Positive delta = receipt; negative = issue/out.
   */
  async applyMovement(input: {
    projectId: string;
    materialId: string;
    location: string;
    baseQtyDelta: number;
    /** Unit cost hint for receipts (standard rate / PO rate). */
    unitCostHint?: number;
    sourceLedgerId?: Types.ObjectId | null;
    batch?: string | null;
    session: ClientSession;
    transactionDate: Date;
  }): Promise<CostApplyResult> {
    const method = await this.resolveMethod(input.projectId);
    const absQty = Math.abs(input.baseQtyDelta);
    if (absQty < 1e-12) {
      return {
        unitCost: 0,
        totalValue: 0,
        costingMethod: method,
        costLayerIds: [],
      };
    }

    if (input.baseQtyDelta > 0) {
      return this.applyReceipt({
        ...input,
        qty: absQty,
        unitCost: Math.max(0, input.unitCostHint ?? 0),
        method,
      });
    }
    return this.applyIssue({
      ...input,
      qty: absQty,
      method,
    });
  }

  private async applyReceipt(input: {
    projectId: string;
    materialId: string;
    location: string;
    qty: number;
    unitCost: number;
    method: InventoryCostingMethod;
    sourceLedgerId?: Types.ObjectId | null;
    batch?: string | null;
    session: ClientSession;
    transactionDate: Date;
  }): Promise<CostApplyResult> {
    if (
      input.method === InventoryCostingMethod.WeightedAverage ||
      input.method === InventoryCostingMethod.MovingAverage
    ) {
      const existing = await this.layerModel
        .find({
          projectId: new Types.ObjectId(input.projectId),
          materialId: new Types.ObjectId(input.materialId),
          location: input.location,
          remainingQty: { $gt: 0 },
        })
        .session(input.session)
        .exec();

      const onHandQty = existing.reduce((s, l) => s + l.remainingQty, 0);
      const onHandValue = existing.reduce(
        (s, l) => s + l.remainingQty * l.unitCost,
        0,
      );
      const newAvg =
        onHandQty + input.qty > 0
          ? (onHandValue + input.qty * input.unitCost) /
            (onHandQty + input.qty)
          : input.unitCost;

      if (existing.length) {
        await this.layerModel
          .updateMany(
            { _id: { $in: existing.map((l) => l._id) } },
            { $set: { remainingQty: 0 } },
            { session: input.session },
          )
          .exec();
      }

      const [layer] = await this.layerModel.create(
        [
          {
            projectId: new Types.ObjectId(input.projectId),
            materialId: new Types.ObjectId(input.materialId),
            location: input.location,
            unitCost: newAvg,
            originalQty: onHandQty + input.qty,
            remainingQty: onHandQty + input.qty,
            receivedAt: input.transactionDate,
            sourceLedgerId: input.sourceLedgerId ?? null,
            batch: input.batch ?? null,
          },
        ],
        { session: input.session },
      );

      return {
        unitCost: input.unitCost,
        totalValue: input.qty * input.unitCost,
        costingMethod: input.method,
        costLayerIds: [layer._id as Types.ObjectId],
      };
    }

    // FIFO — new layer
    const [layer] = await this.layerModel.create(
      [
        {
          projectId: new Types.ObjectId(input.projectId),
          materialId: new Types.ObjectId(input.materialId),
          location: input.location,
          unitCost: input.unitCost,
          originalQty: input.qty,
          remainingQty: input.qty,
          receivedAt: input.transactionDate,
          sourceLedgerId: input.sourceLedgerId ?? null,
          batch: input.batch ?? null,
        },
      ],
      { session: input.session },
    );

    return {
      unitCost: input.unitCost,
      totalValue: input.qty * input.unitCost,
      costingMethod: InventoryCostingMethod.Fifo,
      costLayerIds: [layer._id as Types.ObjectId],
    };
  }

  private async applyIssue(input: {
    projectId: string;
    materialId: string;
    location: string;
    qty: number;
    method: InventoryCostingMethod;
    session: ClientSession;
  }): Promise<CostApplyResult> {
    const layers = await this.layerModel
      .find({
        projectId: new Types.ObjectId(input.projectId),
        materialId: new Types.ObjectId(input.materialId),
        location: input.location,
        remainingQty: { $gt: 0 },
      })
      .sort({ receivedAt: 1, createdAt: 1 })
      .session(input.session)
      .exec();

    let remaining = input.qty;
    let value = 0;
    const usedIds: Types.ObjectId[] = [];

    for (const layer of layers) {
      if (remaining <= 1e-12) break;
      const take = Math.min(layer.remainingQty, remaining);
      layer.remainingQty = Math.max(0, layer.remainingQty - take);
      await layer.save({ session: input.session });
      value += take * layer.unitCost;
      usedIds.push(layer._id as Types.ObjectId);
      remaining -= take;
    }

    const consumed = input.qty - Math.max(0, remaining);
    const unitCost = consumed > 0 ? value / consumed : 0;

    return {
      unitCost,
      totalValue: value,
      costingMethod: input.method,
      costLayerIds: usedIds,
    };
  }

  async getAverageUnitCost(input: {
    projectId: string;
    materialId: string;
    location?: string | null;
  }): Promise<number> {
    const location = (input.location ?? '').trim();
    const layers = await this.layerModel
      .find({
        projectId: new Types.ObjectId(input.projectId),
        materialId: new Types.ObjectId(input.materialId),
        location,
        remainingQty: { $gt: 0 },
      })
      .lean()
      .exec();
    const qty = layers.reduce((s, l) => s + l.remainingQty, 0);
    if (qty <= 0) return 0;
    const value = layers.reduce((s, l) => s + l.remainingQty * l.unitCost, 0);
    return value / qty;
  }
}
