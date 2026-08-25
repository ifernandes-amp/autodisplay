import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_SUFFIX = '_test';

export function assertTestDatabaseUrl(databaseUrl: string): void {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '');

  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run destructive integration tests against "${databaseName}". Use a database ending with "${TEST_DATABASE_SUFFIX}".`,
    );
  }
}

export function createIntegrationPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests.');
  }

  assertTestDatabaseUrl(databaseUrl);

  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

export async function truncateDomainTables(
  prisma: PrismaClient,
): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL ?? '');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      log_auditoria,
      nota_fiscal,
      credito_antecipacao,
      movimento_caixa,
      baixa,
      conta_receber,
      conta_pagar,
      cliente,
      fornecedor,
      categoria,
      conta_bancaria,
      sessao_usuario,
      usuario,
      empresa
    RESTART IDENTITY CASCADE;
  `);
}

export async function setAuditContext(
  prisma: PrismaClient,
  usuarioId: string,
  correlationId: string,
): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.usuario_id', ${usuarioId}, false)`;
  await prisma.$executeRaw`SELECT set_config('app.correlation_id', ${correlationId}, false)`;
}

export async function clearAuditContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.usuario_id', '', false)`;
  await prisma.$executeRaw`SELECT set_config('app.correlation_id', '', false)`;
}
