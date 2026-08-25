import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditContextService } from '../auditoria/audit-context.service';
import type { EnvConfig } from '../config/env.schema';
import { SESSION_TOUCH_INTERVAL_MS } from './auth.constants';
import type {
  AuthenticatedUser,
  SessionValidationResult,
} from './types/authenticated-user';

export interface CreatedSession {
  readonly sessionId: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly auditContextService: AuditContextService,
  ) {}

  generateRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private getIdleMs(): number {
    return (
      this.configService.get('AUTH_SESSION_IDLE_MINUTES', { infer: true }) *
      60_000
    );
  }

  private getAbsoluteMs(): number {
    return (
      this.configService.get('AUTH_SESSION_ABSOLUTE_HOURS', { infer: true }) *
      60 *
      60_000
    );
  }

  private getMaxSessions(): number {
    return this.configService.get('AUTH_MAX_SESSIONS_PER_USER', {
      infer: true,
    });
  }

  async createSession(
    user: AuthenticatedUser,
    context?: { usuarioId?: string; correlationId?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<CreatedSession> {
    const db = tx ?? this.prisma;
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const expiraEm = new Date(now.getTime() + this.getAbsoluteMs());

    const runCreate = async (
      client: Prisma.TransactionClient | PrismaService,
    ): Promise<CreatedSession> => {
      await this.enforceSessionLimit(user.id, client);

      const session = await client.sessaoUsuario.create({
        data: {
          empresaId: user.empresaId,
          usuarioId: user.id,
          tokenHash,
          criadaEm: now,
          ultimoUsoEm: now,
          expiraEm,
        },
      });

      return {
        sessionId: session.id,
        rawToken,
        expiresAt: expiraEm,
      };
    };

    if (context?.usuarioId || context?.correlationId) {
      if (tx) {
        return this.auditContextService.run(
          {
            usuarioId: context.usuarioId,
            correlationId: context.correlationId,
          },
          () => runCreate(tx),
        );
      }

      return this.auditContextService.run(
        {
          usuarioId: context.usuarioId,
          correlationId: context.correlationId,
        },
        () => runCreate(db),
      );
    }

    return runCreate(db);
  }

  private async enforceSessionLimit(
    usuarioId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    const maxSessions = this.getMaxSessions();
    const activeSessions = await client.sessaoUsuario.findMany({
      where: {
        usuarioId,
        revogadaEm: null,
        expiraEm: { gt: new Date() },
      },
      orderBy: { criadaEm: 'asc' },
      select: { id: true },
    });

    const excess = activeSessions.length - maxSessions + 1;
    if (excess <= 0) {
      return;
    }

    const toRevoke = activeSessions.slice(0, excess);
    await client.sessaoUsuario.updateMany({
      where: { id: { in: toRevoke.map((session) => session.id) } },
      data: {
        revogadaEm: new Date(),
        motivoRevogacao: 'max_sessions_exceeded',
      },
    });
  }

  async validateSession(
    rawToken: string | undefined,
  ): Promise<SessionValidationResult | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.sessaoUsuario.findUnique({
      where: { tokenHash },
      include: {
        usuario: {
          select: {
            id: true,
            empresaId: true,
            nome: true,
            email: true,
            perfil: true,
            inativadoEm: true,
          },
        },
      },
    });

    if (!session || session.revogadaEm) {
      return null;
    }

    const now = new Date();
    if (session.expiraEm <= now) {
      await this.revokeSession(session.id, 'expired_absolute');
      return null;
    }

    const idleLimit = this.getIdleMs();
    if (now.getTime() - session.ultimoUsoEm.getTime() > idleLimit) {
      await this.revokeSession(session.id, 'expired_idle');
      return null;
    }

    const configuredEmpresaId = this.configService.get('AUTH_EMPRESA_ID', {
      infer: true,
    });

    if (
      session.usuario.inativadoEm ||
      session.usuario.empresaId !== configuredEmpresaId ||
      session.empresaId !== configuredEmpresaId
    ) {
      await this.revokeSession(session.id, 'user_inactive_or_tenant_mismatch');
      return null;
    }

    if (
      now.getTime() - session.ultimoUsoEm.getTime() >=
      SESSION_TOUCH_INTERVAL_MS
    ) {
      await this.prisma.sessaoUsuario.update({
        where: { id: session.id },
        data: { ultimoUsoEm: now },
      });
    }

    const user: AuthenticatedUser = {
      id: session.usuario.id,
      empresaId: session.usuario.empresaId,
      nome: session.usuario.nome,
      email: session.usuario.email,
      perfil: session.usuario.perfil,
    };

    return {
      user,
      sessionId: session.id,
      rawToken,
    };
  }

  async revokeSession(
    sessionId: string,
    motivoRevogacao: string,
  ): Promise<void> {
    await this.prisma.sessaoUsuario.updateMany({
      where: {
        id: sessionId,
        revogadaEm: null,
      },
      data: {
        revogadaEm: new Date(),
        motivoRevogacao,
      },
    });
  }

  async revokeAllForUser(
    usuarioId: string,
    motivoRevogacao: string,
  ): Promise<void> {
    await this.prisma.sessaoUsuario.updateMany({
      where: {
        usuarioId,
        revogadaEm: null,
      },
      data: {
        revogadaEm: new Date(),
        motivoRevogacao,
      },
    });
  }

  async pruneExpiredSessions(olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60_000);
    const result = await this.prisma.sessaoUsuario.deleteMany({
      where: {
        OR: [{ expiraEm: { lt: cutoff } }, { revogadaEm: { lt: cutoff } }],
      },
    });
    return result.count;
  }
}
