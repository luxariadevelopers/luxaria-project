import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { AddressEmbed, AddressEmbedSchema } from './address.embed';

export type CompanyAddressHistoryDocument = HydratedDocument<CompanyAddressHistory>;

export enum CompanyAddressType {
  Registered = 'registered',
  Corporate = 'corporate',
}

@Schema({
  collection: 'company_address_history',
  timestamps: true,
})
export class CompanyAddressHistory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: CompanyAddressType, required: true, index: true })
  addressType!: CompanyAddressType;

  @Prop({ type: AddressEmbedSchema, required: true })
  address!: AddressEmbed;

  @Prop({ type: Date, required: true, index: true })
  effectiveFrom!: Date;

  /** Null while this row is the current address for the type. */
  @Prop({ type: Date, default: null, index: true })
  effectiveTo!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  changeReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanyAddressHistorySchema =
  SchemaFactory.createForClass(CompanyAddressHistory);

CompanyAddressHistorySchema.plugin(baseSchemaPlugin);
CompanyAddressHistorySchema.plugin(softDeletePlugin);

CompanyAddressHistorySchema.index({ companyId: 1, addressType: 1, effectiveFrom: -1 });
