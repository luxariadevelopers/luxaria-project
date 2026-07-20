import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { sanitizeObjectDeep } from './xss-sanitize.util';

/**
 * Sanitizes string fields in JSON bodies against common XSS payloads.
 * Query/params are left alone (IDs/filters); body is the persistence path.
 */
@Injectable()
export class XssSanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObjectDeep(req.body);
    }
    next();
  }
}
