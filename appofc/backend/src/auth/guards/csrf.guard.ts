import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.schema';
import { CSRF_HEADER_NAME, CSRF_INVALID_MESSAGE } from '../auth.constants';
import { CsrfService } from '../csrf.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    this.assertOriginAllowed(request);

    const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;
    const cookieToken = request.cookies?.[this.csrfService.getCookieName()] as
      string | undefined;

    if (!this.csrfService.tokensMatch(headerToken, cookieToken)) {
      throw new ForbiddenException(CSRF_INVALID_MESSAGE);
    }

    return true;
  }

  private assertOriginAllowed(request: Request): void {
    const fetchSite = request.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site') {
      throw new ForbiddenException(CSRF_INVALID_MESSAGE);
    }

    const origin = request.headers.origin;
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    if (!origin) {
      if (nodeEnv === 'production') {
        throw new ForbiddenException(CSRF_INVALID_MESSAGE);
      }
      return;
    }

    const allowedOrigin = this.configService.get('FRONTEND_ORIGIN', {
      infer: true,
    });

    if (origin !== allowedOrigin) {
      throw new ForbiddenException(CSRF_INVALID_MESSAGE);
    }
  }
}
