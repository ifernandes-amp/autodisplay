import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { AuditContextService } from '../../auditoria/audit-context.service';
import { CORRELATION_ID_HEADER } from '../auth.constants';

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly auditContextService: AuditContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId = this.resolveCorrelationId(request);
    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    const usuarioId = request.user?.id;

    return new Observable((observer) => {
      this.auditContextService.run({ usuarioId, correlationId }, () => {
        next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (error: unknown) => observer.error(error),
          complete: () => observer.complete(),
        });
      });
    });
  }

  private resolveCorrelationId(request: Request): string {
    const header = request.headers[CORRELATION_ID_HEADER];
    if (typeof header === 'string' && CORRELATION_ID_PATTERN.test(header)) {
      return header;
    }

    return randomUUID();
  }
}
