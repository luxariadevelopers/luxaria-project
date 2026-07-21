import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type MaterialDocument = HydratedDocument<Material>;

export enum MaterialUnit {
  Number = 'number',
  Bag = 'bag',
  Kilogram = 'kilogram',
  Ton = 'ton',
  Litre = 'litre',
  Metre = 'metre',
  SquareFoot = 'square_foot',
  CubicFoot = 'cubic_foot',
  Load = 'load',
  Box = 'box',
}

export enum MaterialStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum MaterialType {
  Consumable = 'consumable',
  Asset = 'asset',
}

export enum AbcClassification {
  A = 'A',
  B = 'B',
  C = 'C',
}

/**
 * Conversion: 1 × `unit` = `factorToBase` × baseUnit.
 * Example: baseUnit=kilogram, unit=ton, factorToBase=1000.
 */
@Schema({ _id: false })
export class UnitConversionFactor {
  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  factorToBase!: number;
}

export const UnitConversionFactorSchema =
  SchemaFactory.createForClass(UnitConversionFactor);

@Schema({
  collection: 'materials',
  timestamps: true,
})
export class Material {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  materialCode!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  category!: string;

  @Prop({ type: String, trim: true, default: null })
  specification!: string | null;

  @Prop({ type: String, trim: true, default: null })
  brand!: string | null;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  @Prop({
    type: [String],
    enum: MaterialUnit,
    default: [],
  })
  alternateUnits!: MaterialUnit[];

  @Prop({ type: [UnitConversionFactorSchema], default: [] })
  conversionFactors!: UnitConversionFactor[];

  @Prop({ type: Number, min: 0, default: 0 })
  standardRate!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  minimumStock!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  reorderLevel!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  maximumStock!: number;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  standardWastagePercentage!: number;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  ledgerAccountId!: Types.ObjectId;

  /** Optional link to company material category catalog. */
  @Prop({ type: Types.ObjectId, ref: 'MaterialCategory', default: null, index: true })
  materialCategoryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null, index: true })
  materialGroup!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null, index: true })
  hsnCode!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  gstRate!: number | null;

  @Prop({ type: [Types.ObjectId], ref: 'Vendor', default: [] })
  preferredVendorIds!: Types.ObjectId[];

  @Prop({ type: Number, min: 0, default: null })
  shelfLifeDays!: number | null;

  @Prop({ type: Boolean, default: false })
  batchControlled!: boolean;

  @Prop({ type: Boolean, default: false })
  serialControlled!: boolean;

  @Prop({
    type: String,
    enum: MaterialType,
    default: MaterialType.Consumable,
    index: true,
  })
  materialType!: MaterialType;

  @Prop({
    type: String,
    enum: AbcClassification,
    default: null,
    index: true,
  })
  abcClassification!: AbcClassification | null;

  /** Stable barcode / QR payload key (defaults to materialCode). */
  @Prop({ type: String, trim: true, uppercase: true, default: null, index: true })
  barcode!: string | null;

  @Prop({
    type: String,
    enum: MaterialStatus,
    default: MaterialStatus.Active,
    index: true,
  })
  status!: MaterialStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);

MaterialSchema.plugin(baseSchemaPlugin);
MaterialSchema.plugin(softDeletePlugin);

MaterialSchema.index({
  name: 'text',
  materialCode: 'text',
  category: 'text',
  brand: 'text',
  specification: 'text',
});
MaterialSchema.index({ status: 1, category: 1 });
MaterialSchema.index({ baseUnit: 1 });
