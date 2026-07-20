import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Strips MongoDB operator keys (`$…`) and prototype-pollution keys from
 * inbound JSON / query / params to reduce NoSQL injection risk.
 */
export function sanitizeValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)) as T;
  }

  if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      output[key] = sanitizeValue(nested);
    }
    return output as T;
  }

  return value;
}

@Injectable()
export class MongoSanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const cleaned = sanitizeValue(req.query as Record<string, unknown>);
      for (const key of Object.keys(req.query)) {
        delete (req.query as Record<string, unknown>)[key];
      }
      Object.assign(req.query, cleaned);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }
    next();
  }
}
