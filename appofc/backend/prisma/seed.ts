import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const razaoSocial = process.env.SEED_EMPRESA_RAZAO_SOCIAL?.trim();
  const cnpj = process.env.SEED_EMPRESA_CNPJ?.replace(/\D/g, '');
  const nomeFantasia = process.env.SEED_EMPRESA_NOME_FANTASIA?.trim();

  if (!razaoSocial || !cnpj) {
    console.log(
      'Seed skipped: set SEED_EMPRESA_RAZAO_SOCIAL and SEED_EMPRESA_CNPJ to create the default company.',
    );
    return;
  }

  if (cnpj.length !== 14) {
    throw new Error('SEED_EMPRESA_CNPJ must contain exactly 14 digits.');
  }

  const empresa = await prisma.empresa.upsert({
    where: { cnpj },
    create: {
      razaoSocial,
      nomeFantasia: nomeFantasia ?? null,
      cnpj,
      ativa: true,
    },
    update: {
      razaoSocial,
      nomeFantasia: nomeFantasia ?? null,
      ativa: true,
    },
  });

  console.log(`Seed complete: empresa ${empresa.id} (${empresa.razaoSocial}).`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
