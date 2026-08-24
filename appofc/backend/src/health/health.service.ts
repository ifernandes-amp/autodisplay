import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkReadiness(): Promise<{ status: 'ok'; checkedAt: string }> {
    try {
      await this.prisma.pingDatabase();
      return {
        status: 'ok',
        checkedAt: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
