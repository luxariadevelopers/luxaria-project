import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  collection: 'refresh_tokens',
  timestamps: true,
})
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  /** SHA-256 hash of the refresh token — never store plain tokens. */
  @Prop({ required: true, unique: true })
  tokenHash!: string;

  /** Rotation family id — all tokens in a login chain share this. */
  @Prop({ required: true, index: true })
  familyId!: string;

  @Prop({ type: String, default: null })
  deviceName!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null, index: true })
  revokedAt!: Date | null;

  @Prop({ type: String, default: null })
  replacedByTokenHash!: string | null;

  @Prop({ type: Date, default: null })
  lastUsedAt!: Date | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.plugin(baseSchemaPlugin);
RefreshTokenSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
