import { createHash } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { PerfilUsuario, PrismaClient } from '@prisma/client';
import {
  clearAuditContext,
  createIntegrationPrismaClient,
  setAuditContext,
  truncateDomainTables,
} from './test-database.helper';

const EMPRESA_ID = '00000000-0000-4000-8000-000000000001';
const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const PASSWORD = 'integration-pass-123';

describe('Auth persistence (integration)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.AUTH_EMPRESA_ID = EMPRESA_ID;
    prisma = createIntegrationPrismaClient();
  });

  beforeEach(async () => {
    await truncateDomainTables(prisma);
    await clearAuditContext(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores only session token hash, never raw token', async () => {
    const senhaHash = await hash(PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await prisma.empresa.create({
      data: {
        id: EMPRESA_ID,
        razaoSocial: 'Empresa Auth',
        cnpj: '99887766554433',
      },
    });

    await setAuditContext(prisma, ACTOR_ID, 'auth-integration');

    const usuario = await prisma.usuario.create({
      data: {
        empresaId: EMPRESA_ID,
        nome: 'Auth User',
        email: 'user@test.local',
        senhaHash,
        perfil: PerfilUsuario.EXECUTIVO,
      },
    });

    const rawToken = 'test-token-not-persisted-value-1234567890ab';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prisma.sessaoUsuario.create({
      data: {
        empresaId: EMPRESA_ID,
        usuarioId: usuario.id,
        tokenHash,
        expiraEm: new Date(Date.now() + 60 * 60_000),
      },
    });

    const stored = await prisma.sessaoUsuario.findFirst({
      where: { usuarioId: usuario.id },
    });

    expect(stored?.tokenHash).toBe(tokenHash);
    expect(stored?.tokenHash).not.toContain(rawToken);
  });

  it('audits usuario updates with actor context', async () => {
    const senhaHash = await hash(PASSWORD, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    await prisma.empresa.create({
      data: {
        id: EMPRESA_ID,
        razaoSocial: 'Empresa Audit',
        cnpj: '11223344556677',
      },
    });

    const usuario = await prisma.usuario.create({
      data: {
        empresaId: EMPRESA_ID,
        nome: 'Audit User',
        email: 'audit@test.local',
        senhaHash,
        perfil: PerfilUsuario.LANCAMENTO,
      },
    });

    await setAuditContext(prisma, usuario.id, 'login-audit');
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcessoEm: new Date() },
    });

    const logs = await prisma.logAuditoria.findMany({
      where: { entidade: 'usuario', entidadeId: usuario.id },
    });

    expect(logs.some((log) => log.acao === 'UPDATE')).toBe(true);
    expect(logs.some((log) => log.usuarioId === usuario.id)).toBe(true);
    expect(JSON.stringify(logs)).not.toContain('senha_hash');
  });
});
