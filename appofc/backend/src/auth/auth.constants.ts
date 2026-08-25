export const SESSION_COOKIE_NAME_PROD = '__Host-ad_session';
export const SESSION_COOKIE_NAME_DEV = 'ad_session';
export const CSRF_COOKIE_NAME_PROD = '__Host-ad_csrf';
export const CSRF_COOKIE_NAME_DEV = 'ad_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos';
export const LOGIN_RATE_LIMIT_MESSAGE =
  'Muitas tentativas. Tente novamente em instantes.';
export const CSRF_INVALID_MESSAGE = 'Requisição inválida.';
export const FORBIDDEN_MESSAGE = 'Acesso negado.';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export const LOGIN_THROTTLE = {
  short: { ttl: 60_000, limit: 5 },
  long: { ttl: 15 * 60_000, limit: 10 },
} as const;

export const PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
