import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CashAccountDocument = HydratedDocument<CashAccount>;

export enum CashAccountKind {
  SiteCash = 'site_cash',
  PettyCash = 'petty_cash',
}

export enum CashAccountStatus {
  Active = 'active',
  PendingHandover = 'pending_handover',
  Closed = 'closed',
}

@Schema({ _id: false })
export class CustodianHandover {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  initiatedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  initiatedAt!: Date;

  @Prop({ type: Date, default: null })
  outgoingConfirmedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  outgoingConfirmedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  incomingConfirmedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  incomingConfirmedBy!: Types.ObjectId | null;

  @Prop({ type: Number, default: null, min: 0 })
  declaredBalance!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const CustodianHandoverSchema =
  SchemaFactory.createForClass(CustodianHandover);

@Schema({
  collection: 'cash_accounts',
  timestamps: true,
})
export class CashAccount {
  @Prop({ required: true, unique: true, trim: true, uppercase: true, index: true })
  accountCode!: string;

  @Prop({ required: true, trim: true })
  accountName!: string;

  @Prop({
    type: String,
    enum: CashAccountKind,
    required: true,
    index: true,
  })
  kind!: CashAccountKind;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Active custodian — required while account is active / pending handover */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  custodianUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  ledgerAccountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  maximumHoldingLimit!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  replenishmentLevel!: number;

  @Prop({ type: Number, required: true, default: 0 })
  openingBalance!: number;

  @Prop({
    type: String,
    enum: CashAccountStatus,
    default: CashAccountStatus.Active,
    index: true,
  })
  status!: CashAccountStatus;

  @Prop({ type: CustodianHandoverSchema, default: null })
  pendingHandover!: CustodianHandover | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  closeReason!: string | null;
}

export const CashAccountSchema = SchemaFactory.createForClass(CashAccount);

CashAccountSchema.plugin(baseSchemaPlugin);
CashAccountSchema.plugin(softDeletePlugin);

CashAccountSchema.index({ projectId: 1, kind: 1, status: 1 });
CashAccountSchema.index({ custodianUserId: 1, status: 1 });
