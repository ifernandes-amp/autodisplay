import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth.constants';

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  private readonly dummyHashPromise = hash(
    'autodisplay-dummy-password-for-timing',
    ARGON2_OPTIONS,
  );

  assertLength(password: string): void {
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      throw new Error('Password length out of bounds.');
    }
  }

  async hashPassword(password: string): Promise<string> {
    this.assertLength(password);
    return hash(password, ARGON2_OPTIONS);
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    this.assertLength(password);
    return verify(passwordHash, password, ARGON2_OPTIONS);
  }

  async verifyOrDummy(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    this.assertLength(password);

    if (!passwordHash) {
      const dummyHash = await this.dummyHashPromise;
      await verify(dummyHash, password, ARGON2_OPTIONS);
      return false;
    }

    return verify(passwordHash, password, ARGON2_OPTIONS);
  }
}
