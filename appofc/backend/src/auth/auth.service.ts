import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { EnvConfig } from '../config/env.schema';
import { AuditContextService } from '../auditoria/audit-context.service';
import { PrismaService } from '../database/prisma.service';
import {
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  SESSION_COOKIE_NAME_DEV,
  SESSION_COOKIE_NAME_PROD,
} from './auth.constants';
import { CsrfService } from './csrf.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import type { AuthenticatedUser } from './types/authenticated-user';

export interface AuthUserResponse {
  id: string;
  nome: string;
  email: string;
  perfil: AuthenticatedUser['perfil'];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly csrfService: CsrfService,
    private readonly auditContextService: AuditContextService,
  ) {}

  getSessionCookieName(): string {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production'
      ? SESSION_COOKIE_NAME_PROD
      : SESSION_COOKIE_NAME_DEV;
  }

  toUserResponse(user: AuthenticatedUser): AuthUserResponse {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    };
  }

  issueCsrfToken(res: Response): { csrfToken: string } {
    const { token } = this.csrfService.issueToken();
    this.csrfService.setCsrfCookie(res, token);
    return { csrfToken: token };
  }

  setSessionCookie(res: Response, rawToken: string, expiresAt: Date): void {
    const cookieName = this.getSessionCookieName();
    const secure =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());

    res.cookie(cookieName, rawToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  clearSessionCookie(res: Response): void {
    const cookieName = this.getSessionCookieName();
    const secure =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }

  async login(
    email: string,
    senha: string,
    res: Response,
    correlationId?: string,
  ): Promise<AuthUserResponse> {
    const empresaId = this.configService.get('AUTH_EMPRESA_ID', {
      infer: true,
    });

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        empresaId,
        email,
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        email: true,
        perfil: true,
        senhaHash: true,
        inativadoEm: true,
      },
    });

    const isActive = Boolean(usuario && !usuario.inativadoEm);
    const senhaHash = isActive ? (usuario?.senhaHash ?? null) : null;
    const passwordValid = await this.passwordService.verifyOrDummy(
      senha,
      senhaHash,
    );

    if (!isActive || !passwordValid || !usuario) {
      this.logger.warn({
        event: 'auth.login_rejected',
        correlationId,
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException(LOGIN_INVALID_CREDENTIALS_MESSAGE);
    }

    const user: AuthenticatedUser = {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    };

    const session = await this.auditContextService.run(
      { usuarioId: user.id, correlationId },
      async () =>
        this.prisma.withAuditTransaction(async (tx) => {
          await tx.usuario.update({
            where: { id: user.id },
            data: { ultimoAcessoEm: new Date() },
          });

          return this.sessionService.createSession(
            user,
            {
              usuarioId: user.id,
              correlationId,
            },
            tx,
          );
        }),
    );

    this.setSessionCookie(res, session.rawToken, session.expiresAt);

    const csrf = this.csrfService.issueToken();
    const absoluteMs =
      this.configService.get('AUTH_SESSION_ABSOLUTE_HOURS', { infer: true }) *
      60 *
      60_000;
    this.csrfService.setCsrfCookie(res, csrf.token, absoluteMs);

    this.logger.log({
      event: 'auth.login_success',
      correlationId,
      usuarioId: user.id,
      perfil: user.perfil,
    });

    return this.toUserResponse(user);
  }

  async logout(
    sessionId: string | undefined,
    res: Response,
    correlationId?: string,
  ): Promise<void> {
    if (sessionId) {
      await this.sessionService.revokeSession(sessionId, 'logout');
    }

    this.clearSessionCookie(res);
    this.csrfService.clearCsrfCookie(res);

    this.logger.log({
      event: 'auth.logout',
      correlationId,
      sessionId,
    });
  }
}
