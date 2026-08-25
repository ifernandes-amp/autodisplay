import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuditContextService } from '../auditoria/audit-context.service';
import type { EnvConfig } from '../config/env.schema';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly auditContextService: AuditContextService,
  ) {
    super({
      log:
        configService.get('NODE_ENV', { infer: true }) === 'production'
          ? []
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async pingDatabase(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async withAuditTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const context = this.auditContextService.get();

    return this.$transaction(async (tx) => {
      if (context?.usuarioId) {
        await tx.$executeRaw`SELECT set_config('app.usuario_id', ${context.usuarioId}, true)`;
      }

      if (context?.correlationId) {
        await tx.$executeRaw`SELECT set_config('app.correlation_id', ${context.correlationId}, true)`;
      }

      return callback(tx);
    });
  }
}
