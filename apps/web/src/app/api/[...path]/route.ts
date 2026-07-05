import { NextRequest, NextResponse } from 'next/server';
import type { ApiErrorBody } from '@wallet/shared';

type ServerApiEnv = Record<string, string | undefined>;

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export function resolveServerApiBaseUrl(env: ServerApiEnv = process.env): string {
  return (env.API_INTERNAL_URL?.trim() || env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000').replace(/\/+$/, '');
}

export function rewriteProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  const setCookie = headers.get('set-cookie');
  if (setCookie) {
    headers.set('set-cookie', setCookie.replace(/Path=\/auth\/refresh\b/gi, 'Path=/api/auth/refresh'));
  }
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return headers;
}


async function proxyApiRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = new URL(`${resolveServerApiBaseUrl()}/${path.map(encodeURIComponent).join('/')}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('if-none-match');
  headers.delete('if-modified-since');

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      cache: 'no-store',
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: rewriteProxyResponseHeaders(upstreamResponse.headers),
    });
  } catch {
    const body: ApiErrorBody = {
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'Unable to reach API service',
    };
    return NextResponse.json(body, { status: 502 });
  }
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
