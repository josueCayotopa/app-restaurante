// Service worker de CADE: la app abre aunque el WiFi esté caído y muestra los últimos
// datos conocidos. Los pedidos sin conexión NO pasan por aquí: los guarda la cola de
// envío del propio app (localStorage) y los manda al volver la red.
const VERSION = 'cade-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

// GET de la API que vale la pena tener a mano sin red (se refrescan siempre que hay conexión)
const API_CACHEABLE = [
  '/api/productos', '/api/categorias', '/api/mesas', '/api/zonas',
  '/api/carta/promociones', '/api/comandas/activas', '/api/turnos/activo',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Red primero; si falla, lo último guardado
async function redPrimero(request, claveCache = request) {
  const cache = await caches.open(VERSION)
  try {
    const resp = await fetch(request)
    if (resp.ok) cache.put(claveCache, resp.clone())
    return resp
  } catch (e) {
    const guardada = await cache.match(claveCache)
    if (guardada) return guardada
    throw e
  }
}

// Caché primero (archivos con hash en el nombre y fotos: no cambian)
async function cachePrimero(request) {
  const cache = await caches.open(VERSION)
  const guardada = await cache.match(request)
  if (guardada) return guardada
  const resp = await fetch(request)
  if (resp.ok) cache.put(request, resp.clone())
  return resp
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Navegación (abrir la app / recargar): index.html aunque no haya red
  if (request.mode === 'navigate') {
    event.respondWith(redPrimero(request, '/index.html'))
    return
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cachePrimero(request))
    return
  }
  if (API_CACHEABLE.includes(url.pathname)) {
    event.respondWith(redPrimero(request))
  }
})
