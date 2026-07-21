import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type UnitDocument = HydratedDocument<Unit>;

/**
 * Sales inventory lifecycle.
 * Available → Held → Reserved → Booked → Agreement → Registered → Handed Over
 * (+ Sold alias for closed sale; Cancelled / Blocked terminals)
 */
export enum UnitStatus {
  Available = 'available',
  Held = 'held',
  Reserved = 'reserved',
  Booked = 'booked',
  AgreementExecuted = 'agreement_executed',
  Registered = 'registered',
  Sold = 'sold',
  HandedOver = 'handed_over',
  Cancelled = 'cancelled',
  Blocked = 'blocked',
}

export enum UnitType {
  Studio = 'studio',
  OneBhk = '1bhk',
  TwoBhk = '2bhk',
  ThreeBhk = '3bhk',
  FourBhk = '4bhk',
  Penthouse = 'penthouse',
  Villa = 'villa',
  Shop = 'shop',
  Office = 'office',
  Plot = 'plot',
  Other = 'other',
}

export enum UnitFacing {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
  NorthEast = 'north_east',
  NorthWest = 'north_west',
  SouthEast = 'south_east',
  SouthWest = 'south_west',
  Other = 'other',
}

@Schema({
  collection: 'units',
  timestamps: true,
})
export class Unit {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Block label within the project (e.g. A, Tower-1). */
  @Prop({ required: true, trim: true, uppercase: true })
  block!: string;

  /** Floor label (e.g. 1, G, Podium). */
  @Prop({ required: true, trim: true, uppercase: true })
  floor!: string;

  @Prop({ required: true, trim: true, uppercase: true })
  unitNumber!: string;

  @Prop({
    type: String,
    enum: UnitType,
    required: true,
    index: true,
  })
  unitType!: UnitType;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  carpetArea!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  builtUpArea!: number;

  /** Saleable / super built-up area used for pricing. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  saleableArea!: number;

  /** Undivided share of land. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  uds!: number;

  @Prop({
    type: String,
    enum: UnitFacing,
    default: null,
  })
  facing!: UnitFacing | null;

  /** Configuration label (e.g. 2BHK+Study). */
  @Prop({ type: String, trim: true, default: null })
  configuration!: string | null;

  @Prop({ type: [String], default: [] })
  amenities!: string[];

  @Prop({ type: String, trim: true, default: null })
  parking!: string | null;

  @Prop({ type: String, trim: true, default: null })
  floorPlanPath!: string | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  basePrice!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  additionalCharges!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  @Prop({
    type: String,
    enum: UnitStatus,
    required: true,
    default: UnitStatus.Available,
    index: true,
  })
  status!: UnitStatus;

  /** Optional customer/booking reference when held/reserved/booked. */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  bookingRefId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);

UnitSchema.plugin(baseSchemaPlugin);
UnitSchema.plugin(softDeletePlugin);

/** Active unit number must be unique within a project and block. */
UnitSchema.index(
  { projectId: 1, block: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_unit_number_project_block_active',
  },
);

UnitSchema.index({ projectId: 1, status: 1 });
UnitSchema.index({ projectId: 1, block: 1, floor: 1 });
UnitSchema.index({ status: 1, updatedAt: -1 });
