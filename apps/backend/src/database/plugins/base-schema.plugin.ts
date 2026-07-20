import type { Schema } from 'mongoose';
import { Types } from 'mongoose';

export type BaseSchemaFields = {
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
};

/**
 * Adds Luxaria audit + soft-delete fields and common indexes.
 * Apply to every business collection schema.
 */
export function baseSchemaPlugin(schema: Schema): void {
  schema.add({
    createdBy: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    updatedBy: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  });

  schema.set('timestamps', true);

  schema.index({ isDeleted: 1, createdAt: -1 });
  schema.index({ createdBy: 1, createdAt: -1 });
  schema.index({ updatedBy: 1, updatedAt: -1 });
  schema.index({ isDeleted: 1, deletedAt: -1 });
}
