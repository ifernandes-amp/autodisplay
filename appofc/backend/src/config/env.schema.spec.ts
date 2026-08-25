import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL:
      'postgresql://autodisplay:autodisplay_dev@localhost:5432/autodisplay',
    FRONTEND_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'info',
    AUTH_EMPRESA_ID: '00000000-0000-4000-8000-000000000001',
    AUTH_CSRF_SECRET: 'local-dev-csrf-secret-min-32-chars!!',
    AUTH_SESSION_IDLE_MINUTES: '30',
    AUTH_SESSION_ABSOLUTE_HOURS: '12',
    AUTH_MAX_SESSIONS_PER_USER: '3',
  };

  it('accepts a valid configuration', () => {
    const env = validateEnv(validConfig);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toContain('postgresql://');
  });

  it('rejects missing DATABASE_URL without leaking secrets', () => {
    const withoutDatabaseUrl = { ...validConfig };
    delete (withoutDatabaseUrl as Partial<typeof validConfig>).DATABASE_URL;

    expect(() => validateEnv(withoutDatabaseUrl)).toThrow(
      /Invalid environment configuration.*DATABASE_URL/i,
    );
  });

  it('rejects invalid DATABASE_URL format', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
      }),
    ).toThrow(/PostgreSQL connection string/i);
  });
});
