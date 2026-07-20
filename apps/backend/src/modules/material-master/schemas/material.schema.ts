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
