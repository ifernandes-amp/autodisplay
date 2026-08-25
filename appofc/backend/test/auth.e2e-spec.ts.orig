import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from '@node-rs/argon2';
import { AppModule } from '../src/app.module';
import {
  createIntegrationPrismaClient,
  truncateDomainTables,
} from './integration/test-database.helper';
import { PerfilUsuario } from '@prisma/client';

const EMPRESA_ID = '00000000-0000-4000-8000-000000000001';
const PASSWORD = 'integration-pass-123';

async function createTestUser(
  prisma: ReturnType<typeof createIntegrationPrismaClient>,
) {
  const senhaHash = await hash(PASSWORD, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.empresa.create({
    data: {
      id: EMPRESA_ID,
      razaoSocial: 'Empresa Auth Test',
      cnpj: '12345678901234',
      ativa: true,
    },
  });

  return prisma.usuario.create({
    data: {
      empresaId: EMPRESA_ID,
      nome: 'Usuaria Teste',
      email: 'auth@test.local',
      senhaHash,
      perfil: PerfilUsuario.LANCAMENTO,
    },
  });
}

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createIntegrationPrismaClient>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://autodisplay:autodisplay_dev@localhost:5432/autodisplay_test';
    process.env.AUTH_EMPRESA_ID = EMPRESA_ID;
    process.env.AUTH_CSRF_SECRET = 'integration-test-csrf-secret-min-32!!';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

    prisma = createIntegrationPrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  beforeEach(async () => {
    await truncateDomainTables(prisma);
    await createTestUser(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function fetchCsrf(agent: ReturnType<typeof request.agent>) {
    const response = await agent.get('/api/auth/csrf').expect(200);
    const csrfToken = response.body.csrfToken as string;
    const setCookie = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : [];
    const csrfCookie = cookies.find((value: string) =>
      value.startsWith('ad_csrf='),
    );
    expect(csrfToken).toBeTruthy();
    expect(csrfCookie).toBeTruthy();
    return csrfToken;
  }

  it('logs in, returns profile, and logs out', async () => {
    const agent = request.agent(app.getHttpServer());

    const csrfToken = await fetchCsrf(agent);

    const loginResponse = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'auth@test.local', senha: PASSWORD })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      email: 'auth@test.local',
      perfil: 'LANCAMENTO',
    });

    const meResponse = await agent.get('/api/auth/me').expect(200);
    expect(meResponse.body.email).toBe('auth@test.local');

    const logoutCsrf = await fetchCsrf(agent);
    await agent
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', logoutCsrf)
      .expect(204);

    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects login without CSRF token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'auth@test.local', senha: PASSWORD })
      .expect(403);
  });

  it('returns generic error for invalid credentials', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrfToken = await fetchCsrf(agent);

    const response = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'auth@test.local', senha: 'wrong-password-1' })
      .expect(401);

    expect(response.body.message).toBe('E-mail ou senha inválidos');
  });
});
