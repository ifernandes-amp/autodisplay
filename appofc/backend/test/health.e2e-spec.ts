import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthModule } from '../src/health/health.module';
import { HealthService } from '../src/health/health.service';

describe('HealthModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(HealthService)
      .useValue({
        checkReadiness: jest.fn().mockResolvedValue({
          status: 'ok',
          checkedAt: '2026-08-24T00:00:00.000Z',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET) returns liveness', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/api/ready (GET) returns readiness', () => {
    return request(app.getHttpServer())
      .get('/api/ready')
      .expect(200)
      .expect({ status: 'ok', checkedAt: '2026-08-24T00:00:00.000Z' });
  });
});
