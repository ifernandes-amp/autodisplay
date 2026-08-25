import { afterEach, describe, expect, it, mock } from 'bun:test';
import { ApiError, apiRequest, configureApiClient } from './api-client';

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    configureApiClient({});
  });

  it('returns parsed JSON for successful responses', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ok', checkedAt: '2026-08-24T00:00:00.000Z' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as typeof fetch;

    await expect(apiRequest('/ready')).resolves.toEqual({
      status: 'ok',
      checkedAt: '2026-08-24T00:00:00.000Z',
    });
  });

  it('normalizes API errors', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Database unavailable' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as typeof fetch;

    await expect(apiRequest('/ready')).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({
        message: 'Database unavailable',
        statusCode: 503,
      }),
    );
  });

  it('maps abort errors to timeout responses', async () => {
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;

    await expect(apiRequest('/ready', { timeoutMs: 5 })).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({
        message: 'Request timed out',
        statusCode: 408,
      }),
    );
  });

  it('sends credentials and CSRF header on mutations', async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as typeof fetch;

    await apiRequest('/auth/logout', { method: 'POST' }, 'csrf-token-value');

    expect(capturedInit?.credentials).toBe('include');
    expect((capturedInit?.headers as Record<string, string>)['X-CSRF-Token']).toBe(
      'csrf-token-value',
    );
  });

  it('handles 204 responses without parsing JSON', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    ) as typeof fetch;

    await expect(
      apiRequest<void>('/auth/logout', { method: 'POST' }, 'token'),
    ).resolves.toBeUndefined();
  });

  it('invokes unauthorized callback on 401', async () => {
    let unauthorizedCalls = 0;
    configureApiClient({
      onUnauthorized: () => {
        unauthorizedCalls += 1;
      },
    });

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as typeof fetch;

    await expect(apiRequest('/auth/me')).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({ statusCode: 401 }),
    );
    expect(unauthorizedCalls).toBe(1);
  });
});
