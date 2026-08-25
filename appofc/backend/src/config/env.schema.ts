import { z } from 'zod';

const postgresUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (value) =>
      value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must be a PostgreSQL connection string',
  );

const authCsrfSecretSchema = z
  .string()
  .min(32, 'AUTH_CSRF_SECRET must be at least 32 characters');

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: postgresUrlSchema,
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SENTRY_DSN: z.string().url().optional(),
  AUTH_EMPRESA_ID: z.string().uuid(),
  AUTH_CSRF_SECRET: authCsrfSecretSchema,
  AUTH_SESSION_IDLE_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(480)
    .default(30),
  AUTH_SESSION_ABSOLUTE_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(72)
    .default(12),
  AUTH_MAX_SESSIONS_PER_USER: z.coerce.number().int().min(1).max(10).default(3),
});

export type EnvConfig = z.infer<typeof baseEnvSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = baseEnvSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = result.data;

  if (env.NODE_ENV === 'production' && env.AUTH_CSRF_SECRET.length < 32) {
    throw new Error(
      'Invalid environment configuration: AUTH_CSRF_SECRET must be at least 32 characters in production',
    );
  }

  return env;
}
