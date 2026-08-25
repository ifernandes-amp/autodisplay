import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';
import type { EnvConfig } from '../config/env.schema';
import { CSRF_COOKIE_NAME_DEV, CSRF_COOKIE_NAME_PROD } from './auth.constants';
import type { CsrfTokenPair } from './types/authenticated-user';

@Injectable()
export class CsrfService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private getSecret(): string {
    return this.configService.get('AUTH_CSRF_SECRET', { infer: true });
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  getCookieName(): string {
    return this.isProduction() ? CSRF_COOKIE_NAME_PROD : CSRF_COOKIE_NAME_DEV;
  }

  issueToken(): CsrfTokenPair {
    const nonce = randomBytes(32).toString('base64url');
    const signature = createHmac('sha256', this.getSecret())
      .update(nonce)
      .digest('base64url');
    const token = `${nonce}.${signature}`;
    return { token, cookieValue: token };
  }

  isValidToken(token: string | undefined): boolean {
    if (!token) {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [nonce, signature] = parts;
    if (!nonce || !signature) {
      return false;
    }

    const expected = createHmac('sha256', this.getSecret())
      .update(nonce)
      .digest('base64url');

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  tokensMatch(
    headerToken: string | undefined,
    cookieToken: string | undefined,
  ): boolean {
    if (!headerToken || !cookieToken) {
      return false;
    }

    if (!this.isValidToken(headerToken) || !this.isValidToken(cookieToken)) {
      return false;
    }

    const headerBuffer = Buffer.from(headerToken);
    const cookieBuffer = Buffer.from(cookieToken);

    if (headerBuffer.length !== cookieBuffer.length) {
      return false;
    }

    return timingSafeEqual(headerBuffer, cookieBuffer);
  }

  setCsrfCookie(res: Response, token: string, maxAgeMs?: number): void {
    const cookieName = this.getCookieName();
    const secure = this.isProduction();

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
    });
  }

  clearCsrfCookie(res: Response): void {
    const cookieName = this.getCookieName();
    const secure = this.isProduction();

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }
}
