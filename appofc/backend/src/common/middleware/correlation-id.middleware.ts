import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../../auth/auth.constants';

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers[CORRELATION_ID_HEADER];
    const correlationId =
      typeof header === 'string' && CORRELATION_ID_PATTERN.test(header)
        ? header
        : randomUUID();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
