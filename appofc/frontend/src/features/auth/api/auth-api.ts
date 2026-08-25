import { apiRequest } from '../../../lib/api-client';
import { getCsrfToken, setCsrfToken } from '../../../lib/csrf-token';
import type { AuthUser, CsrfResponse, LoginPayload } from '../types/auth';

export async function fetchCsrfToken(): Promise<string> {
  const response = await apiRequest<CsrfResponse>('/auth/csrf');
  setCsrfToken(response.csrfToken);
  return response.csrfToken;
}

export function login(payload: LoginPayload): Promise<AuthUser> {
  return apiRequest<AuthUser>(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    getCsrfToken(),
  );
}

export function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' }, getCsrfToken());
}
