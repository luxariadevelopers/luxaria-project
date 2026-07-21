import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type EquipmentDocument = HydratedDocument<Equipment>;

export enum EquipmentOwnership {
  Own = 'own',
  Hire = 'hire',
}

export enum EquipmentStatus {
  Available = 'available',
  Allocated = 'allocated',
  Maintenance = 'maintenance',
  Breakdown = 'breakdown',
  Retired = 'retired',
}

@Schema({ _id: true })
export class EquipmentAllocation {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  siteId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  fromDate!: Date;

  @Prop({ type: Date, default: null })
  toDate!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recordedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  recordedAt!: Date;
}

export const EquipmentAllocationSchema =
  SchemaFactory.createForClass(EquipmentAllocation);

@Schema({ _id: true })
export class EquipmentFuelLog {
  _id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, default: null, min: 0 })
  cost!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recordedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  recordedAt!: Date;
}

export const EquipmentFuelLogSchema =
  SchemaFactory.createForClass(EquipmentFuelLog);

@Schema({ _id: true })
export class EquipmentMaintenanceLog {
  _id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: Number, default: null, min: 0 })
  cost!: number | null;

  @Prop({ type: String, trim: true, default: null })
  vendor!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recordedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  recordedAt!: Date;
}

export const EquipmentMaintenanceLogSchema = SchemaFactory.createForClass(
  EquipmentMaintenanceLog,
);

@Schema({ _id: true })
export class EquipmentBreakdownLog {
  _id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  resolution!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recordedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  recordedAt!: Date;
}

export const EquipmentBreakdownLogSchema = SchemaFactory.createForClass(
  EquipmentBreakdownLog,
);

@Schema({
  collection: 'equipment',
  timestamps: true,
})
export class Equipment {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  type!: string | null;

  @Prop({ type: String, trim: true, default: null })
  category!: string | null;

  @Prop({
    type: String,
    enum: EquipmentOwnership,
    required: true,
    index: true,
  })
  ownership!: EquipmentOwnership;

  @Prop({
    type: String,
    enum: EquipmentStatus,
    default: EquipmentStatus.Available,
    index: true,
  })
  status!: EquipmentStatus;

  /** Current site allocation (denormalized from latest open allocation). */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: [EquipmentAllocationSchema], default: [] })
  allocations!: EquipmentAllocation[];

  @Prop({ type: [EquipmentFuelLogSchema], default: [] })
  fuelLogs!: EquipmentFuelLog[];

  @Prop({ type: [EquipmentMaintenanceLogSchema], default: [] })
  maintenanceLogs!: EquipmentMaintenanceLog[];

  @Prop({ type: [EquipmentBreakdownLogSchema], default: [] })
  breakdownLogs!: EquipmentBreakdownLog[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

EquipmentSchema.plugin(baseSchemaPlugin);
EquipmentSchema.plugin(softDeletePlugin);

EquipmentSchema.index({ projectId: 1, code: 1 }, { unique: true });
EquipmentSchema.index({ projectId: 1, status: 1, name: 1 });
