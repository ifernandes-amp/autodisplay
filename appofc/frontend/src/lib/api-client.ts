export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: unknown;

  constructor(message: string, statusCode: number, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ReadyResponse {
  status: 'ok';
  checkedAt: string;
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | undefined;

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function configureApiClient(options: { onUnauthorized?: UnauthorizedHandler }): void {
  onUnauthorized = options.onUnauthorized;
}

function buildHeaders(
  fetchOptions: RequestInit,
  method: string,
  csrfToken: string | null,
): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (MUTATING_METHODS.has(method.toUpperCase()) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiClientOptions = {},
  csrfToken: string | null = null,
): Promise<T> {
  const { baseUrl = '/api', timeoutMs = 10_000, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: buildHeaders(fetchOptions, method, csrfToken),
    });

    if (response.status === 204) {
      if (!response.ok) {
        throw new ApiError('Request failed', response.status);
      }
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    const hasJson = contentType?.includes('application/json');
    const payload = hasJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 401) {
        onUnauthorized?.();
      }

      const message =
        payload && typeof payload === 'object' && payload !== null && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : `Request failed with status ${response.status}`;

      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }

    throw new ApiError('Network request failed', 0);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function fetchReadyStatus(): Promise<ReadyResponse> {
  return apiRequest<ReadyResponse>('/ready');
}
