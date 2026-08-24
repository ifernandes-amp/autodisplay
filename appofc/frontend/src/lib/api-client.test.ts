import { afterEach, describe, expect, it, mock } from 'bun:test';
import { ApiError, apiRequest } from './api-client';

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
});
