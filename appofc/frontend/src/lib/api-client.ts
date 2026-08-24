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

export async function apiRequest<T>(
  path: string,
  options: RequestInit & ApiClientOptions = {},
): Promise<T> {
  const { baseUrl = '/api', timeoutMs = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(fetchOptions.headers ?? {}),
      },
    });

    const contentType = response.headers.get('content-type');
    const hasJson = contentType?.includes('application/json');
    const payload = hasJson ? await response.json() : null;

    if (!response.ok) {
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
