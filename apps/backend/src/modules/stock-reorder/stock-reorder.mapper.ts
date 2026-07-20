import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type {
  StockReorderAlertStatus,
  StockReorderAlertType,
} from './schemas/stock-reorder-alert.schema';

export type PublicStockForecast = {
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  daysOfCover: number | null;
  estimatedStockOutDate: Date | null;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  recommendedPurchaseQuantity: number;
  hasOpenPurchaseOrder: boolean;
  lookbackDays: number;
  alerts: StockReorderAlertType[];
};

export type PublicStockReorderAlert = {
  id: string;
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  alertType: StockReorderAlertType;
  status: StockReorderAlertStatus;
  message: string;
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  estimatedStockOutDate: Date | null;
  reorderLevel: number;
  recommendedPurchaseQuantity: number;
  baseUnit: MaterialUnit;
  evaluatedAt: Date;
  jobId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AlertLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  alertType: StockReorderAlertType;
  status: StockReorderAlertStatus;
  message: string;
  availableStock: number;
  pendingPoQuantity: number;
  averageDailyConsumption: number;
  estimatedStockOutDate?: Date | null;
  reorderLevel: number;
  recommendedPurchaseQuantity: number;
  baseUnit: MaterialUnit;
  evaluatedAt: Date;
  jobId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicStockReorderAlert(
  row: AlertLike,
): PublicStockReorderAlert {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    materialCode: row.materialCode ?? null,
    materialName: row.materialName ?? null,
    alertType: row.alertType,
    status: row.status,
    message: row.message,
    availableStock: row.availableStock,
    pendingPoQuantity: row.pendingPoQuantity,
    averageDailyConsumption: row.averageDailyConsumption,
    estimatedStockOutDate: row.estimatedStockOutDate ?? null,
    reorderLevel: row.reorderLevel,
    recommendedPurchaseQuantity: row.recommendedPurchaseQuantity,
    baseUnit: row.baseUnit,
    evaluatedAt: row.evaluatedAt,
    jobId: row.jobId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
