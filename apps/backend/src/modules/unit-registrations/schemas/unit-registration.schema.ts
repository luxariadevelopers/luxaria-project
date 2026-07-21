import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type UnitRegistrationDocument = HydratedDocument<UnitRegistration>;

export enum UnitRegistrationStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Registered = 'registered',
  Cancelled = 'cancelled',
}

@Schema({ _id: false })
export class SubRegistrarOffice {
  @Prop({ type: String, trim: true, default: null })
  name!: string | null;

  @Prop({ type: String, trim: true, default: null })
  address!: string | null;

  @Prop({ type: String, trim: true, default: null })
  district!: string | null;
}

export const SubRegistrarOfficeSchema =
  SchemaFactory.createForClass(SubRegistrarOffice);

@Schema({ _id: false })
export class RegistrationWitness {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  address!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;
}

export const RegistrationWitnessSchema =
  SchemaFactory.createForClass(RegistrationWitness);

@Schema({
  collection: 'unit_registrations',
  timestamps: true,
})
export class UnitRegistration {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  registrationNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'SaleAgreement',
    default: null,
    index: true,
  })
  agreementId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: UnitRegistrationStatus,
    required: true,
    default: UnitRegistrationStatus.Draft,
    index: true,
  })
  status!: UnitRegistrationStatus;

  @Prop({ type: Date, default: null })
  registrationDate!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  documentNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  ecReference!: string | null;

  @Prop({ type: SubRegistrarOfficeSchema, default: () => ({}) })
  sro!: SubRegistrarOffice;

  @Prop({ type: Number, min: 0, default: null })
  stampDuty!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  registrationCharges!: number | null;

  @Prop({ type: [RegistrationWitnessSchema], default: [] })
  witnesses!: RegistrationWitness[];

  @Prop({ type: String, trim: true, default: null })
  documentPath!: string | null;

  @Prop({ type: String, trim: true, default: null })
  documentFileName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  registeredBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  registeredAt!: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UnitRegistrationSchema =
  SchemaFactory.createForClass(UnitRegistration);

UnitRegistrationSchema.plugin(baseSchemaPlugin);
UnitRegistrationSchema.plugin(softDeletePlugin);

UnitRegistrationSchema.index({ projectId: 1, status: 1, createdAt: -1 });
UnitRegistrationSchema.index({ unitId: 1, status: 1 });
UnitRegistrationSchema.index({ customerId: 1, createdAt: -1 });
