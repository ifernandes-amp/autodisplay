import { z } from 'zod';

const postgresUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (value) =>
      value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must be a PostgreSQL connection string',
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: postgresUrlSchema,
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SENTRY_DSN: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
