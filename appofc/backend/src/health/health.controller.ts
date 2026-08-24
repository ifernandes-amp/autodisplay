import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(): Promise<{ status: 'ok'; checkedAt: string }> {
    return this.healthService.checkReadiness();
  }
}
