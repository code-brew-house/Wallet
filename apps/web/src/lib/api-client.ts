import type { ApiErrorBody } from '@wallet/shared';
type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
  fetchImpl?: FetchImplementation;
}

export function resolveApiBaseUrl(_env?: unknown): string {
  return '/api';
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: ApiErrorBody['code'],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function formatApiError(error: ApiErrorBody | undefined, path: string, status: number): string {
  const message = error?.message?.trim() || `Request to ${path} failed with status ${status}`;
  const details = Object.values(error?.details ?? {}).flat().filter((detail) => detail.trim().length > 0);
  return details.length > 0 ? `${message}: ${details.join('; ')}` : message;
}

function isGetRequest(init: RequestInit): boolean {
  return init.method === undefined || init.method.toUpperCase() === 'GET';
}

function needsWalletReadCacheBust(path: string, init: RequestInit): boolean {
  return isGetRequest(init) && (path.includes('/dashboard') || path.includes('/envelopes') || path.includes('/activity'));
}

function appendWalletFreshParam(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_walletFresh=${Date.now()}`;
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const token = options.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const cache = isGetRequest(init) ? 'no-store' : init.cache;
    const requestInit: RequestInit = { ...init, headers, credentials: 'include', ...(cache ? { cache } : {}) };
    const requestPath = needsWalletReadCacheBust(path, init) ? appendWalletFreshParam(path) : path;
    const response = await fetchImpl(`${options.baseUrl}${requestPath}`, requestInit);
    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = body as ApiErrorBody | undefined;
      throw new ApiRequestError(formatApiError(error, path, response.status), response.status, error?.code);
    }
    return body as T;
  }

  return { request };
}

export const apiClient = createApiClient({
  baseUrl: resolveApiBaseUrl(),
  getAccessToken: () => (typeof window === 'undefined' ? null : window.sessionStorage.getItem('wallet_access_token')),
});
