import type { Connection } from 'mongoose';
import { Types } from 'mongoose';

/**
 * Query Mongo collections that may not exist yet (future SE waves).
 * Returns empty/zero results instead of throwing when missing.
 */
export async function collectionExists(
  connection: Connection,
  name: string,
): Promise<boolean> {
  const db = connection.db;
  if (!db) return false;
  try {
    const found = await db.listCollections({ name }, { nameOnly: true }).toArray();
    return found.length > 0;
  } catch {
    return false;
  }
}

export async function countDocumentsSafe(
  connection: Connection,
  collectionName: string,
  filter: Record<string, unknown>,
): Promise<number> {
  if (!(await collectionExists(connection, collectionName))) {
    return 0;
  }
  try {
    return await connection.collection(collectionName).countDocuments({
      ...filter,
      isDeleted: { $ne: true },
    });
  } catch {
    return 0;
  }
}

export async function aggregateSafe<T>(
  connection: Connection,
  collectionName: string,
  pipeline: Record<string, unknown>[],
): Promise<T[]> {
  if (!(await collectionExists(connection, collectionName))) {
    return [];
  }
  try {
    return (await connection
      .collection(collectionName)
      .aggregate(pipeline)
      .toArray()) as T[];
  } catch {
    return [];
  }
}

export async function findSafe(
  connection: Connection,
  collectionName: string,
  filter: Record<string, unknown>,
  options?: {
    sort?: Record<string, 1 | -1>;
    limit?: number;
    projection?: Record<string, 0 | 1>;
  },
): Promise<Record<string, unknown>[]> {
  if (!(await collectionExists(connection, collectionName))) {
    return [];
  }
  try {
    let cursor = connection.collection(collectionName).find({
      ...filter,
      isDeleted: { $ne: true },
    });
    if (options?.projection) cursor = cursor.project(options.projection);
    if (options?.sort) cursor = cursor.sort(options.sort);
    if (options?.limit) cursor = cursor.limit(options.limit);
    return (await cursor.toArray()) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export function projectOidFilter(projectId: Types.ObjectId) {
  return { projectId };
}
