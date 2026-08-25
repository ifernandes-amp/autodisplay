import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const olderThanDays = Number(process.argv[2] ?? 30);
  if (!Number.isFinite(olderThanDays) || olderThanDays < 1) {
    throw new Error('Usage: bun run scripts/prune-sessions.ts [days=30]');
  }

  const prisma = new PrismaClient();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60_000);

  try {
    const result = await prisma.sessaoUsuario.deleteMany({
      where: {
        OR: [{ expiraEm: { lt: cutoff } }, { revogadaEm: { lt: cutoff } }],
      },
    });

    console.log(
      JSON.stringify({
        deleted: result.count,
        olderThanDays,
        cutoff: cutoff.toISOString(),
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
