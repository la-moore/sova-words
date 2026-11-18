const scope = self.registration.scope
const index = new URL('index.html', scope).href
const cachePrefix = `sova:${scope}:`
const cacheName = cachePrefix + build.version
const assets = new Set(build.files.map(file => new URL(file, scope).href))

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' }))),
  ))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  url.search = ''
  const isGameNavigation = request.mode === 'navigate' && (url.href === scope || url.href === index)
  const cachedUrl = isGameNavigation ? index : request.url
  if (!assets.has(cachedUrl)) return

  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    return await cache.match(cachedUrl) ?? fetch(request)
  })())
})
