importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const walletFreshCacheKeyPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.delete('_walletFresh');
    return url.toString();
  },
};

workbox.routing.registerRoute(
  ({ request, url }) =>
    request.method === "GET" &&
    url.origin === self.location.origin &&
    (url.pathname.includes('/dashboard') || url.pathname.includes('/envelopes') || url.pathname.includes('/activity')),
  new workbox.strategies.NetworkFirst({
    cacheName: 'wallet-readonly-api-v1',
    plugins: [
      walletFreshCacheKeyPlugin,
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);
