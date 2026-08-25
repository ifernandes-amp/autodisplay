import 'dotenv/config';
import { input, password, select, confirm } from '@inquirer/prompts';
import { PerfilUsuario, PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;

function assertInteractive(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('This command requires an interactive terminal (TTY).');
  }
}

function getEmpresaId(): string {
  const empresaId = process.env.AUTH_EMPRESA_ID?.trim();
  if (!empresaId) {
    throw new Error('AUTH_EMPRESA_ID is required.');
  }
  return empresaId;
}

async function main(): Promise<void> {
  assertInteractive();

  const prisma = new PrismaClient();
  const empresaId = getEmpresaId();

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      throw new Error(`Empresa ${empresaId} not found. Run prisma:seed first.`);
    }

    const nome = await input({ message: 'Nome completo:' });
    const emailRaw = await input({ message: 'E-mail:' });
    const email = emailRaw.trim().toLowerCase();
    const perfil = await select({
      message: 'Perfil:',
      choices: [
        { name: 'Lançamento (Gislaine)', value: PerfilUsuario.LANCAMENTO },
        { name: 'Executivo (Cláudia)', value: PerfilUsuario.EXECUTIVO },
      ],
    });

    const senha = await password({
      message: 'Senha (12-128 caracteres):',
      mask: '*',
      validate: (value) =>
        value.length >= 12 && value.length <= 128
          ? true
          : 'Senha deve ter entre 12 e 128 caracteres.',
    });

    const senhaConfirmacao = await password({
      message: 'Confirmar senha:',
      mask: '*',
    });

    if (senha !== senhaConfirmacao) {
      throw new Error('Password confirmation does not match.');
    }

    const confirmed = await confirm({
      message: `Criar usuário ${email} (${perfil}) na empresa ${empresa.razaoSocial}?`,
      default: false,
    });

    if (!confirmed) {
      console.log('Operation cancelled.');
      return;
    }

    const senhaHash = await hash(senha, ARGON2_OPTIONS);

    const usuario = await prisma.usuario.create({
      data: {
        empresaId,
        nome: nome.trim(),
        email,
        senhaHash,
        perfil,
        senhaAlteradaEm: new Date(),
      },
    });

    console.log(
      JSON.stringify({
        id: usuario.id,
        email: usuario.email,
        perfil: usuario.perfil,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
