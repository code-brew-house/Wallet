importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const walletFreshCacheKeyPlugin = {
  cacheKeyWillBeUsed: async ({ request, mode }) => {
    const url = new URL(request.url);
    url.searchParams.delete('_walletFresh');
    console.info('[wallet-sw-cache] cache key normalized', {
      mode,
      originalUrl: request.url,
      cacheKey: url.toString(),
    });
    return url.toString();
  },
};

const walletCacheDiagnosticsPlugin = {
  fetchDidSucceed: async ({ request, response }) => {
    console.info('[wallet-sw-cache] fetch succeeded', {
      url: request.url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      vary: response.headers.get('vary'),
      responseUrl: response.url,
    });
    return response;
  },
  cacheDidUpdate: async ({ cacheName, request }) => {
    console.info('[wallet-sw-cache] cache update complete', {
      cacheName,
      url: request.url,
    });
  },
  fetchDidFail: async ({ originalRequest, request, error }) => {
    console.warn('[wallet-sw-cache] fetch failed', {
      originalUrl: originalRequest?.url,
      url: request.url,
      message: error?.message,
      name: error?.name,
    });
  },
  handlerDidComplete: async ({ request, response, error }) => {
    console.info('[wallet-sw-cache] handler complete', {
      url: request.url,
      status: response?.status,
      contentType: response?.headers?.get('content-type'),
      errorName: error?.name,
      errorMessage: error?.message,
    });
  },
  handlerDidError: async ({ request, error }) => {
    console.error('[wallet-sw-cache] handler error', {
      url: request.url,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    return null;
  },
};

workbox.routing.registerRoute(
  ({ request, url }) => {
    const matched = request.method === "GET" &&
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/') &&
      (url.pathname.includes('/dashboard') || url.pathname.includes('/envelopes') || url.pathname.includes('/activity'));
    if (matched) {
      console.info('[wallet-sw-cache] route match', {
        url: url.toString(),
        mode: request.mode,
        destination: request.destination,
        cache: request.cache,
        credentials: request.credentials,
        accept: request.headers.get('accept'),
      });
    }
    return matched;
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'wallet-readonly-api-v1',
    plugins: [
      walletFreshCacheKeyPlugin,
      walletCacheDiagnosticsPlugin,
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [200],
        headers: {
          'content-type': 'application/json',
        },
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);
