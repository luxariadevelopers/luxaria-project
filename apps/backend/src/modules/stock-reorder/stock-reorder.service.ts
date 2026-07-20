import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { convertToBaseUnit } from '../material-master/materials.validation';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { MaterialStockBalance } from '../stock-ledger/schemas/material-stock-balance.schema';
import type {
  EvaluateStockReorderDto,
  ForecastQueryDto,
  ListStockReorderAlertsQueryDto,
} from './dto/stock-reorder.dto';
import {
  toPublicStockReorderAlert,
  type PublicStockForecast,
} from './stock-reorder.mapper';
import {
  computeAverageDailyConsumption,
  computeDaysOfCover,
  computeEstimatedStockOutDate,
  computeRecommendedPurchaseQuantity,
  evaluateForecastAlerts,
  roundQty,
  type ForecastMetrics,
} from './stock-reorder.validation';
import {
  StockReorderAlert,
  StockReorderAlertStatus,
  StockReorderAlertType,
} from './schemas/stock-reorder-alert.schema';

const OPEN_PO_STATUSES = [
  PurchaseOrderStatus.Issued,
  PurchaseOrderStatus.PartiallyReceived,
];

const ACTIVE_PROJECT_STATUSES = [
  ProjectStatus.Planning,
  ProjectStatus.Approval,
  ProjectStatus.PreConstruction,
  ProjectStatus.Construction,
  ProjectStatus.OnHold,
];

@Injectable()
export class StockReorderService {
  private readonly logger = new Logger(StockReorderService.name);

  constructor(
    @InjectModel(StockReorderAlert.name)
    private readonly alertModel: Model<StockReorderAlert>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(MaterialStockBalance.name)
    private readonly balanceModel: Model<MaterialStockBalance>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async getForecast(query: ForecastQueryDto) {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    if (query.materialId && !Types.ObjectId.isValid(query.materialId)) {
      throw new BadRequestException('Invalid materialId');
    }

    const lookbackDays =
      query.lookbackDays ??
      this.configService.get('stockForecastLookbackDays', { infer: true }) ??
      30;
    const asOf = new Date();
    const rows = await this.buildForecasts({
      projectId: query.projectId,
      materialId: query.materialId,
      lookbackDays,
      asOf,
    });

    return createSuccessResponse(
      rows,
      'Stock reorder forecast computed successfully',
    );
  }

  async listAlerts(query: ListStockReorderAlertsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<StockReorderAlert> = {};

    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.materialId) {
      if (!Types.ObjectId.isValid(query.materialId)) {
        throw new BadRequestException('Invalid materialId');
      }
      filter.materialId = new Types.ObjectId(query.materialId);
    }
    if (query.alertType) filter.alertType = query.alertType;
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { evaluatedAt: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicStockReorderAlert(row)),
      'Stock reorder alerts fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Evaluate forecasts and upsert open alerts. Used by API and background jobs.
   */
  async evaluate(dto: EvaluateStockReorderDto = {}, jobId?: string | null) {
    const asOf = dto.asOf ? new Date(dto.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Invalid asOf date');
    }

    const lookbackDays =
      dto.lookbackDays ??
      this.configService.get('stockForecastLookbackDays', { infer: true }) ??
      30;

    const projectIds = dto.projectId
      ? [dto.projectId]
      : await this.listActiveProjectIds();

    let forecastCount = 0;
    let alertCount = 0;

    for (const projectId of projectIds) {
      const forecasts = await this.buildForecasts({
        projectId,
        materialId: dto.materialId,
        lookbackDays,
        asOf,
      });
      forecastCount += forecasts.length;
      alertCount += await this.persistAlerts(forecasts, asOf, jobId ?? null);
    }

    this.logger.log(
      `Stock reorder evaluation complete: projects=${projectIds.length} forecasts=${forecastCount} alertsUpserted=${alertCount} jobId=${jobId ?? 'inline'}`,
    );

    return createSuccessResponse(
      {
        projectCount: projectIds.length,
        forecastCount,
        alertCount,
        evaluatedAt: asOf,
        jobId: jobId ?? null,
      },
      'Stock reorder evaluation completed',
    );
  }

  async buildForecasts(input: {
    projectId: string;
    materialId?: string;
    lookbackDays: number;
    asOf: Date;
  }): Promise<PublicStockForecast[]> {
    const materialIds = await this.resolveMaterialIds(
      input.projectId,
      input.materialId,
    );
    if (materialIds.length === 0) return [];

    const stockoutAlertDays = this.configService.get('stockStockoutAlertDays', {
      infer: true,
    });
    const slowMovingDays = this.configService.get('stockSlowMovingDays', {
      infer: true,
    });

    const materials = await this.materialModel
      .find({
        _id: { $in: materialIds.map((id) => new Types.ObjectId(id)) },
        status: MaterialStatus.Active,
      })
      .exec();
    const materialMap = new Map(materials.map((m) => [String(m._id), m]));

    const availableByMaterial = await this.sumAvailableStock(
      input.projectId,
      materialIds,
    );
    const pendingByMaterial = await this.sumPendingPoQuantity(
      input.projectId,
      materialIds,
    );
    const consumptionByMaterial = await this.sumConsumption(
      input.projectId,
      materialIds,
      input.lookbackDays,
      input.asOf,
    );

    const rows: PublicStockForecast[] = [];

    for (const materialId of materialIds) {
      const material = materialMap.get(materialId);
      if (!material) continue;

      const availableStock = availableByMaterial.get(materialId) ?? 0;
      const pendingPoQuantity = pendingByMaterial.get(materialId) ?? 0;
      const totalConsumed = consumptionByMaterial.get(materialId) ?? 0;
      const averageDailyConsumption = computeAverageDailyConsumption({
        totalConsumedBase: totalConsumed,
        lookbackDays: input.lookbackDays,
      });
      const daysOfCover = computeDaysOfCover({
        availableStock,
        pendingPoQuantity,
        averageDailyConsumption,
      });
      const estimatedStockOutDate = computeEstimatedStockOutDate({
        asOf: input.asOf,
        daysOfCover,
      });
      const recommendedPurchaseQuantity = computeRecommendedPurchaseQuantity({
        availableStock,
        pendingPoQuantity,
        reorderLevel: material.reorderLevel ?? 0,
        maximumStock: material.maximumStock ?? 0,
      });

      const metrics: ForecastMetrics = {
        availableStock,
        pendingPoQuantity,
        averageDailyConsumption,
        daysOfCover,
        estimatedStockOutDate,
        reorderLevel: material.reorderLevel ?? 0,
        minimumStock: material.minimumStock ?? 0,
        maximumStock: material.maximumStock ?? 0,
        recommendedPurchaseQuantity,
        hasOpenPurchaseOrder: pendingPoQuantity > 1e-9,
        lookbackDays: input.lookbackDays,
      };

      const alerts = evaluateForecastAlerts({
        metrics,
        stockoutAlertDays,
        slowMovingDays,
        asOf: input.asOf,
      });

      rows.push({
        projectId: input.projectId,
        materialId,
        materialCode: material.materialCode,
        materialName: material.name,
        baseUnit: material.baseUnit,
        availableStock,
        pendingPoQuantity,
        averageDailyConsumption,
        daysOfCover,
        estimatedStockOutDate,
        reorderLevel: metrics.reorderLevel,
        minimumStock: metrics.minimumStock,
        maximumStock: metrics.maximumStock,
        recommendedPurchaseQuantity,
        hasOpenPurchaseOrder: metrics.hasOpenPurchaseOrder,
        lookbackDays: input.lookbackDays,
        alerts: alerts.map((a) => a.alertType),
      });
    }

    return rows.sort((a, b) =>
      (a.materialCode ?? '').localeCompare(b.materialCode ?? ''),
    );
  }

  private async persistAlerts(
    forecasts: PublicStockForecast[],
    asOf: Date,
    jobId: string | null,
  ): Promise<number> {
    const stockoutAlertDays = this.configService.get('stockStockoutAlertDays', {
      infer: true,
    });
    const slowMovingDays = this.configService.get('stockSlowMovingDays', {
      infer: true,
    });

    let upserted = 0;

    for (const forecast of forecasts) {
      const metrics: ForecastMetrics = {
        availableStock: forecast.availableStock,
        pendingPoQuantity: forecast.pendingPoQuantity,
        averageDailyConsumption: forecast.averageDailyConsumption,
        daysOfCover: forecast.daysOfCover,
        estimatedStockOutDate: forecast.estimatedStockOutDate,
        reorderLevel: forecast.reorderLevel,
        minimumStock: forecast.minimumStock,
        maximumStock: forecast.maximumStock,
        recommendedPurchaseQuantity: forecast.recommendedPurchaseQuantity,
        hasOpenPurchaseOrder: forecast.hasOpenPurchaseOrder,
        lookbackDays: forecast.lookbackDays,
      };
      const alerts = evaluateForecastAlerts({
        metrics,
        stockoutAlertDays,
        slowMovingDays,
        asOf,
      });
      const activeTypes = new Set(alerts.map((a) => a.alertType));

      // Resolve previously open alerts that no longer apply
      await this.alertModel.updateMany(
        {
          projectId: new Types.ObjectId(forecast.projectId),
          materialId: new Types.ObjectId(forecast.materialId),
          status: StockReorderAlertStatus.Open,
          alertType: { $nin: [...activeTypes] },
        },
        {
          $set: {
            status: StockReorderAlertStatus.Resolved,
            evaluatedAt: asOf,
          },
        },
      );

      for (const alert of alerts) {
        await this.alertModel.findOneAndUpdate(
          {
            projectId: new Types.ObjectId(forecast.projectId),
            materialId: new Types.ObjectId(forecast.materialId),
            alertType: alert.alertType,
            status: StockReorderAlertStatus.Open,
          },
          {
            $set: {
              materialCode: forecast.materialCode,
              materialName: forecast.materialName,
              message: alert.message,
              availableStock: forecast.availableStock,
              pendingPoQuantity: forecast.pendingPoQuantity,
              averageDailyConsumption: forecast.averageDailyConsumption,
              estimatedStockOutDate: forecast.estimatedStockOutDate,
              reorderLevel: forecast.reorderLevel,
              recommendedPurchaseQuantity:
                forecast.recommendedPurchaseQuantity,
              baseUnit: forecast.baseUnit,
              evaluatedAt: asOf,
              jobId,
              status: StockReorderAlertStatus.Open,
            },
            $setOnInsert: {
              projectId: new Types.ObjectId(forecast.projectId),
              materialId: new Types.ObjectId(forecast.materialId),
              alertType: alert.alertType,
            },
          },
          { upsert: true, new: true },
        );
        upserted += 1;
      }
    }

    return upserted;
  }

  private async resolveMaterialIds(
    projectId: string,
    materialId?: string,
  ): Promise<string[]> {
    if (materialId) return [materialId];

    const projectObjectId = new Types.ObjectId(projectId);
    const [fromBalances, fromPos, fromLedger] = await Promise.all([
      this.balanceModel.distinct('materialId', { projectId: projectObjectId }),
      this.purchaseOrderModel.distinct('items.materialId', {
        projectId: projectObjectId,
        status: { $in: OPEN_PO_STATUSES },
      }),
      this.ledgerModel.distinct('materialId', { projectId: projectObjectId }),
    ]);

    const set = new Set<string>();
    for (const id of [...fromBalances, ...fromPos, ...fromLedger]) {
      set.add(String(id));
    }
    return [...set];
  }

  private async sumAvailableStock(
    projectId: string,
    materialIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.balanceModel
      .aggregate<{ _id: Types.ObjectId; qty: number }>([
        {
          $match: {
            projectId: new Types.ObjectId(projectId),
            materialId: {
              $in: materialIds.map((id) => new Types.ObjectId(id)),
            },
          },
        },
        {
          $group: {
            _id: '$materialId',
            qty: { $sum: '$quantityInBaseUnit' },
          },
        },
      ])
      .exec();

    return new Map(rows.map((r) => [String(r._id), roundQty(r.qty)]));
  }

  private async sumPendingPoQuantity(
    projectId: string,
    materialIds: string[],
  ): Promise<Map<string, number>> {
    const materialObjectIds = materialIds.map((id) => new Types.ObjectId(id));
    const orders = await this.purchaseOrderModel
      .find({
        projectId: new Types.ObjectId(projectId),
        status: { $in: OPEN_PO_STATUSES },
        'items.materialId': { $in: materialObjectIds },
      })
      .select({ items: 1 })
      .lean()
      .exec();

    const materials = await this.materialModel
      .find({ _id: { $in: materialObjectIds } })
      .select({ baseUnit: 1, conversionFactors: 1 })
      .exec();
    const materialMap = new Map(materials.map((m) => [String(m._id), m]));

    const pending = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const mid = String(item.materialId);
        if (!materialIds.includes(mid)) continue;
        const balance = Math.max(0, item.balanceQuantity ?? 0);
        if (balance <= 0) continue;
        const material = materialMap.get(mid);
        if (!material) continue;
        const baseQty = convertToBaseUnit(
          balance,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        );
        pending.set(mid, roundQty((pending.get(mid) ?? 0) + baseQty));
      }
    }
    return pending;
  }

  /**
   * Net consumption over the lookback window (non-reversed rows).
   * Ledger `baseUnitQuantity` is signed (+in −out); consumption = max(0, −sum).
   */
  private async sumConsumption(
    projectId: string,
    materialIds: string[],
    lookbackDays: number,
    asOf: Date,
  ): Promise<Map<string, number>> {
    const from = new Date(asOf);
    from.setUTCDate(from.getUTCDate() - lookbackDays);

    const rows = await this.ledgerModel
      .aggregate<{ _id: Types.ObjectId; net: number }>([
        {
          $match: {
            projectId: new Types.ObjectId(projectId),
            materialId: {
              $in: materialIds.map((id) => new Types.ObjectId(id)),
            },
            transactionDate: { $gte: from, $lte: asOf },
            reversedById: null,
            transactionType: {
              $in: [
                StockTransactionType.MaterialIssue,
                StockTransactionType.ReturnFromWork,
                StockTransactionType.Wastage,
                StockTransactionType.Damage,
                StockTransactionType.TheftOrShortage,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$materialId',
            net: { $sum: '$baseUnitQuantity' },
          },
        },
      ])
      .exec();

    return new Map(
      rows.map((row) => [String(row._id), roundQty(Math.max(0, -row.net))]),
    );
  }

  private async listActiveProjectIds(): Promise<string[]> {
    const projects = await this.projectModel
      .find({ status: { $in: ACTIVE_PROJECT_STATUSES } })
      .select({ _id: 1 })
      .lean()
      .exec();
    return projects.map((p) => String(p._id));
  }
}

export type { StockReorderAlertType };
