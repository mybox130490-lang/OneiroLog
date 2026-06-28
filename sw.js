// OneiroLog service worker — офлайн-доступ.
// Стратегия: сеть в приоритете (online всегда свежее, не мешает разработке/HMR),
// при недоступности сети — отдаём из кэша. Кэш версионируется и чистится при активации.

const CACHE = 'oneirolog-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // сторонние запросы (шрифты, API) — мимо

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Кэшируем успешные ответы того же origin для офлайна.
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
        }
        return res
      })
      .catch(async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        // Для навигаций офлайн — отдаём закэшированную оболочку приложения.
        if (req.mode === 'navigate') {
          const shell = await caches.match(self.registration.scope)
          if (shell) return shell
        }
        return Response.error()
      })
  )
})
