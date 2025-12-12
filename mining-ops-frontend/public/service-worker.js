const CACHE_NAME = 'mining-ops-shell-v1';

const sw = self;

const getIndexUrl = () => {
  const scope = new URL(sw.registration.scope);
  const basePath = scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`;
  return `${basePath}index.html`;
};

sw.addEventListener('install', (event) => {
  sw.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([getIndexUrl()]);
    })
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    const indexUrl = getIndexUrl();
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(indexUrl);
      })
    );
    return;
  }

  event.respondWith(fetch(request));
});
