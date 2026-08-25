import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.schema';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 3000,
              DATABASE_URL:
                'postgresql://autodisplay:autodisplay_dev@localhost:5432/autodisplay_test',
              FRONTEND_ORIGIN: 'http://localhost:5173',
              LOG_LEVEL: 'info',
              AUTH_EMPRESA_ID: '00000000-0000-4000-8000-000000000001',
              AUTH_CSRF_SECRET: 'integration-test-csrf-secret-min-32!!',
            }),
          ],
        }),
      ],
      providers: [CsrfService],
    }).compile();

    service = moduleRef.get(CsrfService);
  });

  it('issues valid signed tokens', () => {
    const { token } = service.issueToken();
    expect(service.isValidToken(token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    const { token } = service.issueToken();
    expect(service.isValidToken(`${token}x`)).toBe(false);
  });

  it('matches header and cookie tokens in constant time path', () => {
    const { token } = service.issueToken();
    expect(service.tokensMatch(token, token)).toBe(true);
    expect(service.tokensMatch(token, `${token.slice(0, -1)}a`)).toBe(false);
  });
});
