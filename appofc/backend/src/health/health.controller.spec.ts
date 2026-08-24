import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkReadiness: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
    healthService = module.get(HealthService);
  });

  it('returns liveness without touching the database', () => {
    expect(controller.liveness()).toEqual({ status: 'ok' });
  });

  it('returns readiness when the database responds', async () => {
    const payload = {
      status: 'ok' as const,
      checkedAt: '2026-08-24T00:00:00.000Z',
    };
    jest.spyOn(healthService, 'checkReadiness').mockResolvedValue(payload);

    await expect(controller.readiness()).resolves.toEqual(payload);
  });

  it('propagates readiness failures as 503', async () => {
    jest
      .spyOn(healthService, 'checkReadiness')
      .mockRejectedValue(
        new ServiceUnavailableException('Database unavailable'),
      );

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
