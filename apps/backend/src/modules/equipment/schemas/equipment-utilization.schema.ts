import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type EquipmentUtilizationDocument =
  HydratedDocument<EquipmentUtilization>;

@Schema({
  collection: 'equipment_utilizations',
  timestamps: true,
})
export class EquipmentUtilization {
  @Prop({ type: Types.ObjectId, ref: 'Equipment', required: true, index: true })
  equipmentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'DailyProgressReport',
    default: null,
    index: true,
  })
  dprId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true, index: true })
  date!: Date;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  hoursWorked!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  hoursIdle!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const EquipmentUtilizationSchema = SchemaFactory.createForClass(
  EquipmentUtilization,
);

EquipmentUtilizationSchema.plugin(baseSchemaPlugin);
EquipmentUtilizationSchema.plugin(softDeletePlugin);

EquipmentUtilizationSchema.index({ dprId: 1, date: -1 });
EquipmentUtilizationSchema.index({ projectId: 1, equipmentId: 1, date: -1 });
