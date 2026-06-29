import type { ApiErrorBody } from '@wallet/shared';
type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
  fetchImpl?: FetchImplementation;
}

interface ApiBaseEnv {
  NEXT_PUBLIC_API_BASE_URL?: string;
  NODE_ENV?: string;
}

export function resolveApiBaseUrl(env: ApiBaseEnv = process.env): string {
  const configuredBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required for production builds');
  }

  return 'http://localhost:4000';
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const token = options.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetchImpl(`${options.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = body as ApiErrorBody | undefined;
      throw new Error(error?.message ?? 'Request failed');
    }
    return body as T;
  }

  return { request };
}

export const apiClient = createApiClient({
  baseUrl: resolveApiBaseUrl(),
  getAccessToken: () => (typeof window === 'undefined' ? null : window.sessionStorage.getItem('wallet_access_token')),
});
