import type { CallbackWithoutResultAndOptionalError, Query, Schema, Types } from 'mongoose';

export type SoftDeleteOptions = {
  withDeleted?: boolean;
  onlyDeleted?: boolean;
};

declare module 'mongoose' {
  interface QueryOptions {
    withDeleted?: boolean;
    onlyDeleted?: boolean;
  }

  interface Document {
    softDelete(deletedBy?: Types.ObjectId | null): Promise<this>;
    restore(): Promise<this>;
  }
}

function applySoftDeleteFilter(this: Query<unknown, unknown>): void {
  const options = this.getOptions() as SoftDeleteOptions;

  if (options.withDeleted) {
    return;
  }

  if (options.onlyDeleted) {
    this.where({ isDeleted: true });
    return;
  }

  this.where({ isDeleted: { $ne: true } });
}

/**
 * Soft-delete query helper plugin.
 * - Default find/count/update/delete queries exclude soft-deleted docs
 * - Pass { withDeleted: true } to include them
 * - Pass { onlyDeleted: true } to query only deleted docs
 * - document.softDelete(userId) / document.restore()
 */
export function softDeletePlugin(schema: Schema): void {
  const middleware = function (
    this: Query<unknown, unknown>,
    next: CallbackWithoutResultAndOptionalError,
  ): void {
    applySoftDeleteFilter.call(this);
    next();
  };

  schema.pre('find', middleware);
  schema.pre('findOne', middleware);
  schema.pre('findOneAndUpdate', middleware);
  schema.pre('countDocuments', middleware);
  schema.pre('updateMany', middleware);
  schema.pre('updateOne', middleware);
  schema.pre('deleteMany', middleware);
  schema.pre('deleteOne', middleware);

  schema.methods.softDelete = async function softDelete(
    deletedBy: Types.ObjectId | null = null,
  ) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    return this.save();
  };

  schema.methods.restore = async function restore() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };

  schema.statics.softDeleteById = async function softDeleteById(
    id: Types.ObjectId | string,
    deletedBy: Types.ObjectId | null = null,
  ) {
    return this.findOneAndUpdate(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
      { new: true, withDeleted: true },
    );
  };

  schema.statics.restoreById = async function restoreById(id: Types.ObjectId | string) {
    return this.findOneAndUpdate(
      { _id: id },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
      { new: true, withDeleted: true },
    );
  };
}
