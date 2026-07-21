import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type LabourAttendanceDocument = HydratedDocument<LabourAttendance>;

export enum LabourAttendanceStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Confirmed = 'confirmed',
}

export enum LabourAttendanceEntryMode {
  Group = 'group',
  Individual = 'individual',
}

/** Site-execution shift key (aligns with DPR day/shift uniqueness). */
export enum LabourAttendanceShift {
  Morning = 'morning',
  Afternoon = 'afternoon',
  Night = 'night',
  General = 'general',
}

@Schema({ _id: true })
export class LabourAttendanceWorker {
  _id?: Types.ObjectId;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  workerCode!: string | null;

  @Prop({ required: true, trim: true })
  workerName!: string;

  @Prop({ type: Date, default: null })
  checkIn!: Date | null;

  @Prop({ type: Date, default: null })
  checkOut!: Date | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  overtimeHours!: number;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const LabourAttendanceWorkerSchema = SchemaFactory.createForClass(
  LabourAttendanceWorker,
);

@Schema({ _id: true })
export class LabourAttendanceLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LabourCategory', required: true })
  labourCategoryId!: Types.ObjectId;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  labourCategoryCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  labourCategoryName!: string | null;

  @Prop({
    type: String,
    enum: LabourAttendanceEntryMode,
    required: true,
  })
  entryMode!: LabourAttendanceEntryMode;

  /** Declared headcount (group) or workers.length (individual). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  workerCount!: number;

  /** Aggregate overtime hours for the line. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  overtimeHours!: number;

  @Prop({ type: [LabourAttendanceWorkerSchema], default: [] })
  workers!: LabourAttendanceWorker[];

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;
}

export const LabourAttendanceLineSchema = SchemaFactory.createForClass(
  LabourAttendanceLine,
);

@Schema({
  collection: 'labour_attendances',
  timestamps: true,
})
export class LabourAttendance {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  attendanceNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Optional site scope for DPR daily deployment rollup. */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  /** Optional link to the DPR that rolls up this deployment. */
  @Prop({
    type: Types.ObjectId,
    ref: 'DailyProgressReport',
    default: null,
    index: true,
  })
  dprId!: Types.ObjectId | null;

  /** Calendar date of attendance (UTC midnight). */
  @Prop({ type: Date, required: true, index: true })
  attendanceDate!: Date;

  @Prop({
    type: String,
    enum: LabourAttendanceShift,
    required: true,
    default: LabourAttendanceShift.General,
    index: true,
  })
  shift!: LabourAttendanceShift;

  @Prop({ type: String, trim: true, default: null })
  workLocation!: string | null;

  @Prop({ type: Number, default: null })
  latitude!: number | null;

  @Prop({ type: Number, default: null })
  longitude!: number | null;

  @Prop({ type: [LabourAttendanceLineSchema], default: [] })
  lines!: LabourAttendanceLine[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  groupPhotoDocumentIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({
    type: String,
    enum: LabourAttendanceStatus,
    required: true,
    default: LabourAttendanceStatus.Draft,
    index: true,
  })
  status!: LabourAttendanceStatus;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: String, trim: true, default: null })
  clientDeviceId!: string | null;

  @Prop({ type: Date, default: null })
  offlineCapturedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Boolean, default: false })
  supervisorConfirmed!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  confirmedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  confirmationNotes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LabourAttendanceSchema =
  SchemaFactory.createForClass(LabourAttendance);

LabourAttendanceSchema.plugin(baseSchemaPlugin);
LabourAttendanceSchema.plugin(softDeletePlugin);

LabourAttendanceSchema.index(
  { projectId: 1, contractorId: 1, attendanceDate: 1, siteId: 1, shift: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'uniq_labour_attendance_project_contractor_date_site_shift',
  },
);
LabourAttendanceSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
    name: 'uniq_labour_attendance_idempotency_key',
  },
);
LabourAttendanceSchema.index({
  projectId: 1,
  attendanceDate: -1,
  status: 1,
});
LabourAttendanceSchema.index({
  projectId: 1,
  siteId: 1,
  attendanceDate: 1,
  shift: 1,
});
LabourAttendanceSchema.index({ dprId: 1, attendanceDate: -1 });
