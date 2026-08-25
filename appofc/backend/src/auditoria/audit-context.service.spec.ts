import { AuditContextService } from './audit-context.service';

describe('AuditContextService', () => {
  let service: AuditContextService;

  beforeEach(() => {
    service = new AuditContextService();
  });

  it('returns undefined outside of a scoped run', () => {
    expect(service.get()).toBeUndefined();
  });

  it('exposes the context inside run()', () => {
    const context = {
      usuarioId: '11111111-1111-4111-8111-111111111111',
      correlationId: 'corr-1',
    };

    service.run(context, () => {
      expect(service.get()).toEqual(context);
    });
  });

  it('isolates concurrent contexts', async () => {
    const first = service.run({ correlationId: 'first' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return service.get()?.correlationId;
    });

    const second = service.run({ correlationId: 'second' }, () => {
      return service.get()?.correlationId;
    });

    await expect(first).resolves.toBe('first');
    expect(second).toBe('second');
  });
});
