import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import type { EnvConfig } from '../config/env.schema';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
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
}
