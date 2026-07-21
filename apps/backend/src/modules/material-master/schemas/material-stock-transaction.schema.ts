import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { MaterialUnit } from './material.schema';

export type MaterialStockTransactionDocument =
  HydratedDocument<MaterialStockTransaction>;

export enum StockTransactionType {
  OpeningStock = 'opening_stock',
  PurchaseReceipt = 'purchase_receipt',
  ManualReceipt = 'manual_receipt',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
  MaterialIssue = 'material_issue',
  ReturnFromWork = 'return_from_work',
  ReturnToVendor = 'return_to_vendor',
  Wastage = 'wastage',
  Damage = 'damage',
  Scrap = 'scrap',
  Consumption = 'consumption',
  TheftOrShortage = 'theft_or_shortage',
  Adjustment = 'adjustment',
  ClosingStock = 'closing_stock',
  PhysicalCount = 'physical_count',
  CycleCount = 'cycle_count',
  Reservation = 'reservation',
  ReleaseReservation = 'release_reservation',
  Reversal = 'reversal',
}

export enum InventoryCostingMethod {
  WeightedAverage = 'weighted_average',
  Fifo = 'fifo',
  MovingAverage = 'moving_average',
}

/**
 * Immutable material stock ledger.
 * Corrections must be posted as reversal entries — never update/delete rows.
 */
@Schema({
  collection: 'material_stock_transactions',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class MaterialStockTransaction {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  transactionNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: StockTransactionType,
    required: true,
    index: true,
  })
  transactionType!: StockTransactionType;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  quantityIn!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  quantityOut!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  /**
   * Signed quantity in material base unit: +quantityIn − quantityOut (converted).
   * Kept as `quantityInBaseUnit` alias for existing aggregations.
   */
  @Prop({ type: Number, required: true })
  baseUnitQuantity!: number;

  /** @deprecated alias of baseUnitQuantity for legacy readers */
  @Prop({ type: Number, required: true })
  quantityInBaseUnit!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  @Prop({ type: String, trim: true, required: true, index: true })
  referenceType!: string;

  @Prop({ type: String, trim: true, default: null, index: true })
  referenceId!: string | null;

  @Prop({ type: Date, required: true, index: true })
  transactionDate!: Date;

  @Prop({ type: String, trim: true, default: null, index: true })
  location!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  batch!: string | null;

  @Prop({ type: [String], default: [] })
  serialNumbers!: string[];

  @Prop({ type: Number, default: 0 })
  beforeQty!: number;

  @Prop({ type: Number, default: 0 })
  afterQty!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  unitCost!: number;

  @Prop({ type: Number, default: 0 })
  totalValue!: number;

  @Prop({
    type: String,
    enum: InventoryCostingMethod,
    default: InventoryCostingMethod.WeightedAverage,
  })
  costingMethod!: InventoryCostingMethod;

  @Prop({ type: [Types.ObjectId], default: [] })
  costLayerIds!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  warehouseId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WarehouseLocation', default: null })
  zoneId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WarehouseLocation', default: null })
  rackId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WarehouseLocation', default: null })
  binId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'MaterialStockTransaction',
    default: null,
    index: true,
  })
  reversalOfId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'MaterialStockTransaction',
    default: null,
  })
  reversedById!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
}

export const MaterialStockTransactionSchema = SchemaFactory.createForClass(
  MaterialStockTransaction,
);

MaterialStockTransactionSchema.index({
  materialId: 1,
  projectId: 1,
  transactionDate: -1,
});
MaterialStockTransactionSchema.index({
  projectId: 1,
  transactionType: 1,
  createdAt: -1,
});
MaterialStockTransactionSchema.index({
  transactionNumber: 'text',
  location: 'text',
  batch: 'text',
});

const IMMUTABLE_MSG =
  'Stock ledger entries are immutable; post a reversal to correct';

function isReversalLinkUpdate(update: Record<string, unknown> | null): boolean {
  if (!update || typeof update !== 'object') return false;
  const set =
    (update.$set as Record<string, unknown> | undefined) ??
    (Object.keys(update).some((k) => k.startsWith('$')) ? undefined : update);
  if (!set) return false;
  const keys = Object.keys(set).filter((k) => !k.startsWith('$'));
  return keys.length === 1 && keys[0] === 'reversedById';
}

MaterialStockTransactionSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'] as never,
  function (this: { getUpdate?: () => unknown }, next: (err?: Error) => void) {
    const update = this.getUpdate?.() as Record<string, unknown> | null;
    if (isReversalLinkUpdate(update)) {
      return next();
    }
    return next(new Error(IMMUTABLE_MSG));
  },
);

MaterialStockTransactionSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'] as never,
  function (_next: (err?: Error) => void) {
    throw new Error(IMMUTABLE_MSG);
  },
);

MaterialStockTransactionSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error(IMMUTABLE_MSG));
  }
  return next();
});
