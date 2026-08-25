import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { PUBLIC_KEY } from '../auth.constants';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieName = this.authService.getSessionCookieName();
    const rawToken = request.cookies?.[cookieName] as string | undefined;

    const session = await this.sessionService.validateSession(rawToken);
    if (!session) {
      this.authService.clearSessionCookie(response);
      throw new UnauthorizedException();
    }

    request.user = session.user;
    request.sessionId = session.sessionId;
    request.sessionToken = session.rawToken;

    return true;
  }
}
