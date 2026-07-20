import type { Model, Types, UpdateWriteOpResult } from 'mongoose';

/**
 * Soft-delete a document by id (bypasses soft-delete filter via withDeleted).
 */
export async function softDeleteById<T>(
  model: Model<T>,
  id: Types.ObjectId | string,
  deletedBy: Types.ObjectId | null = null,
): Promise<T | null> {
  return model
    .findOneAndUpdate(
      { _id: id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
      { new: true, withDeleted: true },
    )
    .exec() as Promise<T | null>;
}

/**
 * Restore a soft-deleted document by id.
 */
export async function restoreById<T>(
  model: Model<T>,
  id: Types.ObjectId | string,
): Promise<T | null> {
  return model
    .findOneAndUpdate(
      { _id: id },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
      { new: true, withDeleted: true },
    )
    .exec() as Promise<T | null>;
}

/**
 * Bulk soft-delete matching documents.
 */
export async function softDeleteMany<T>(
  model: Model<T>,
  filter: Record<string, unknown>,
  deletedBy: Types.ObjectId | null = null,
): Promise<UpdateWriteOpResult> {
  return model
    .updateMany(filter, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    })
    .setOptions({ withDeleted: true })
    .exec();
}
