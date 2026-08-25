import {
  OrigemContaPagar,
  Prisma,
  PrismaClient,
  StatusTituloPagar,
  TipoCategoria,
} from '@prisma/client';
import {
  clearAuditContext,
  createIntegrationPrismaClient,
  setAuditContext,
  truncateDomainTables,
} from './test-database.helper';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const CORRELATION_ID = 'integration-test';

describe('Auditoria e integridade do schema (integration)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createIntegrationPrismaClient();
  });

  beforeEach(async () => {
    await truncateDomainTables(prisma);
    await clearAuditContext(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createEmpresa(suffix: string) {
    return prisma.empresa.create({
      data: {
        razaoSocial: `Empresa ${suffix}`,
        cnpj: `${suffix.padStart(14, '0')}`.slice(0, 14),
        ativa: true,
      },
    });
  }

  async function createFornecedor(empresaId: string, nome = 'Fornecedor A') {
    await setAuditContext(prisma, ACTOR_ID, CORRELATION_ID);

    return prisma.fornecedor.create({
      data: {
        empresaId,
        nome,
      },
    });
  }

  async function createCategoria(empresaId: string) {
    await setAuditContext(prisma, ACTOR_ID, CORRELATION_ID);

    return prisma.categoria.create({
      data: {
        empresaId,
        nome: 'Despesas operacionais',
        tipo: TipoCategoria.SAIDA,
      },
    });
  }

  it('registra CREATE em LogAuditoria com contexto de ator', async () => {
    const empresa = await createEmpresa('1001');
    const fornecedor = await createFornecedor(empresa.id);

    const logs = await prisma.logAuditoria.findMany({
      where: {
        entidade: 'fornecedor',
        entidadeId: fornecedor.id,
      },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.acao).toBe('CREATE');
    expect(logs[0]?.usuarioId).toBe(ACTOR_ID);
    expect(logs[0]?.correlationId).toBe(CORRELATION_ID);
    expect(logs[0]?.valorNovo).toMatchObject({ nome: 'Fornecedor A' });
  });

  it('registra UPDATE com valor anterior e valor novo', async () => {
    const empresa = await createEmpresa('1002');
    const fornecedor = await createFornecedor(empresa.id, 'Antigo');

    await setAuditContext(prisma, ACTOR_ID, CORRELATION_ID);
    await prisma.fornecedor.update({
      where: { id: fornecedor.id },
      data: { nome: 'Novo' },
    });

    const log = await prisma.logAuditoria.findFirst({
      where: {
        entidade: 'fornecedor',
        entidadeId: fornecedor.id,
        acao: 'UPDATE',
      },
      orderBy: { ocorridoEm: 'desc' },
    });

    expect(log?.valorAnterior).toMatchObject({ nome: 'Antigo' });
    expect(log?.valorNovo).toMatchObject({ nome: 'Novo' });
  });

  it('marca INACTIVATE quando inativadoEm é preenchido', async () => {
    const empresa = await createEmpresa('1003');
    const fornecedor = await createFornecedor(empresa.id);

    await setAuditContext(prisma, ACTOR_ID, CORRELATION_ID);
    await prisma.fornecedor.update({
      where: { id: fornecedor.id },
      data: { inativadoEm: new Date('2026-08-24T12:00:00.000Z') },
    });

    const log = await prisma.logAuditoria.findFirst({
      where: {
        entidade: 'fornecedor',
        entidadeId: fornecedor.id,
        acao: 'INACTIVATE',
      },
    });

    expect(log).toBeDefined();
  });

  it('redige senha_hash dos snapshots de auditoria', async () => {
    const empresa = await createEmpresa('1004');

    await setAuditContext(prisma, ACTOR_ID, CORRELATION_ID);
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: 'Gislaine',
        email: 'gislaine@example.com',
        senhaHash: 'super-secret-hash',
        perfil: 'LANCAMENTO',
      },
    });

    const log = await prisma.logAuditoria.findFirst({
      where: {
        entidade: 'usuario',
        entidadeId: usuario.id,
      },
    });

    expect(JSON.stringify(log?.valorNovo)).not.toContain('super-secret-hash');
    expect(JSON.stringify(log?.valorNovo)).not.toContain('senha_hash');
  });

  it('bloqueia DELETE físico em entidades auditáveis', async () => {
    const empresa = await createEmpresa('1005');
    const fornecedor = await createFornecedor(empresa.id);

    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM fornecedor WHERE id = '${fornecedor.id}'::uuid`,
      ),
    ).rejects.toThrow();
  });

  it('bloqueia UPDATE e DELETE em LogAuditoria', async () => {
    const empresa = await createEmpresa('1006');
    await createFornecedor(empresa.id);

    const log = await prisma.logAuditoria.findFirst();
    expect(log).toBeDefined();

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE log_auditoria SET entidade = 'hack' WHERE id = '${log!.id}'::uuid`,
      ),
    ).rejects.toThrow();

    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM log_auditoria WHERE id = '${log!.id}'::uuid`,
      ),
    ).rejects.toThrow();
  });

  it('aplica XOR em baixa entre pagar e receber', async () => {
    const empresa = await createEmpresa('1007');
    const fornecedor = await createFornecedor(empresa.id);
    const categoria = await createCategoria(empresa.id);
    const contaBancaria = await prisma.contaBancaria.create({
      data: {
        empresaId: empresa.id,
        nome: 'Conta principal',
        saldoInicial: 0,
      },
    });

    const contaPagar = await prisma.contaPagar.create({
      data: {
        empresaId: empresa.id,
        fornecedorId: fornecedor.id,
        categoriaId: categoria.id,
        valor: new Prisma.Decimal('100.00'),
        dataEmissao: new Date('2026-08-01'),
        dataVencimento: new Date('2026-08-10'),
        status: StatusTituloPagar.EM_ABERTO,
        origem: OrigemContaPagar.NOTA_COMPRA,
      },
    });

    await expect(
      prisma.baixa.create({
        data: {
          empresaId: empresa.id,
          contaPagarId: contaPagar.id,
          contaReceberId: contaPagar.id,
          valor: new Prisma.Decimal('50.00'),
          data: new Date('2026-08-10'),
          contaBancariaId: contaBancaria.id,
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.baixa.create({
        data: {
          empresaId: empresa.id,
          valor: new Prisma.Decimal('50.00'),
          data: new Date('2026-08-10'),
          contaBancariaId: contaBancaria.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejeita relações cross-tenant entre empresa e fornecedor', async () => {
    const empresaA = await createEmpresa('2001');
    const empresaB = await createEmpresa('2002');
    const fornecedorB = await createFornecedor(empresaB.id);
    const categoriaA = await createCategoria(empresaA.id);

    await expect(
      prisma.contaPagar.create({
        data: {
          empresaId: empresaA.id,
          fornecedorId: fornecedorB.id,
          categoriaId: categoriaA.id,
          valor: new Prisma.Decimal('100.00'),
          dataEmissao: new Date('2026-08-01'),
          dataVencimento: new Date('2026-08-10'),
          status: StatusTituloPagar.EM_ABERTO,
          origem: OrigemContaPagar.NOTA_COMPRA,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejeita valores monetários inválidos', async () => {
    const empresa = await createEmpresa('1008');
    const fornecedor = await createFornecedor(empresa.id);
    const categoria = await createCategoria(empresa.id);

    await expect(
      prisma.contaPagar.create({
        data: {
          empresaId: empresa.id,
          fornecedorId: fornecedor.id,
          categoriaId: categoria.id,
          valor: new Prisma.Decimal('0.00'),
          dataEmissao: new Date('2026-08-01'),
          dataVencimento: new Date('2026-08-10'),
          status: StatusTituloPagar.EM_ABERTO,
          origem: OrigemContaPagar.NOTA_COMPRA,
        },
      }),
    ).rejects.toThrow();
  });
});
