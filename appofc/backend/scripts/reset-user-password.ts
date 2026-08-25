import 'dotenv/config';
import { confirm, input, password } from '@inquirer/prompts';
import { PrismaClient } from '@prisma/client';
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
    const emailRaw = await input({ message: 'E-mail do usuário:' });
    const email = emailRaw.trim().toLowerCase();

    const usuario = await prisma.usuario.findFirst({
      where: { empresaId, email },
    });

    if (!usuario) {
      throw new Error('User not found for the configured company.');
    }

    const senha = await password({
      message: 'Nova senha (12-128 caracteres):',
      mask: '*',
      validate: (value) =>
        value.length >= 12 && value.length <= 128
          ? true
          : 'Senha deve ter entre 12 e 128 caracteres.',
    });

    const senhaConfirmacao = await password({
      message: 'Confirmar nova senha:',
      mask: '*',
    });

    if (senha !== senhaConfirmacao) {
      throw new Error('Password confirmation does not match.');
    }

    const confirmed = await confirm({
      message: `Redefinir senha de ${usuario.email} e revogar todas as sessões?`,
      default: false,
    });

    if (!confirmed) {
      console.log('Operation cancelled.');
      return;
    }

    const senhaHash = await hash(senha, ARGON2_OPTIONS);
    const now = new Date();

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senhaHash,
          senhaAlteradaEm: now,
        },
      }),
      prisma.sessaoUsuario.updateMany({
        where: { usuarioId: usuario.id, revogadaEm: null },
        data: {
          revogadaEm: now,
          motivoRevogacao: 'password_reset',
        },
      }),
    ]);

    console.log(
      JSON.stringify({
        id: usuario.id,
        email: usuario.email,
        resetAt: now.toISOString(),
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
