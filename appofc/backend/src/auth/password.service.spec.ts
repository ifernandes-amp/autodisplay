import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes and verifies passwords with Argon2id', async () => {
    const password = 'valid-password-123';
    const hash = await service.hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(service.verifyPassword(password, hash)).resolves.toBe(true);
    await expect(service.verifyPassword('wrong-password', hash)).resolves.toBe(
      false,
    );
  });

  it('produces different hashes for the same password', async () => {
    const password = 'valid-password-123';
    const first = await service.hashPassword(password);
    const second = await service.hashPassword(password);

    expect(first).not.toBe(second);
  });

  it('uses dummy hash path for missing users without throwing', async () => {
    await expect(
      service.verifyOrDummy('valid-password-123', null),
    ).resolves.toBe(false);
  });
});
