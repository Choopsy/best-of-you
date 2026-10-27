/*
 * Service worker d'Équilibre : seulement pour pouvoir ouvrir la liste de courses
 * sans réseau (en magasin). Le reste de l'appli fonctionne normalement en ligne.
 *
 * - /courses : réseau d'abord, copie gardée ; sans réseau, on sert la copie.
 * - Fichiers du site (/_next/static, icônes) : mémorisés au fil de l'eau, ils ne changent jamais.
 * - Autres pages sans réseau : une petite page « Hors connexion » avec un lien vers les courses.
 * - Le message « clear » (envoyé à la déconnexion) efface la copie de la liste.
 */
const PAGES = 'equilibre-pages-v1'
const ASSETS = 'equilibre-assets-v1'
const KEEP = [PAGES, ASSETS]
const COURSES = '/courses'
const MAX_ASSETS = 250

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!KEEP.includes(key)) await caches.delete(key)
    await self.clients.claim()
  })())
})

const isAsset = (url) =>
  url.pathname.startsWith('/_next/static/') || /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)

async function trimAssets() {
  const cache = await caches.open(ASSETS)
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(k)
}

async function cacheFirst(request) {
  const hit = await caches.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok) {
    const cache = await caches.open(ASSETS)
    await cache.put(request, res.clone())
    trimAssets()
  }
  return res
}

/** Garde la page des courses et les fichiers dont elle a besoin pour fonctionner hors ligne. */
async function storeCourses(res) {
  const html = await res.clone().text()
  const pages = await caches.open(PAGES)
  await pages.put(COURSES, res)
  const assets = await caches.open(ASSETS)
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])]
  await Promise.all(urls.map(async (u) => {
    if (await assets.match(u)) return
    try { const r = await fetch(u); if (r.ok) await assets.put(u, r) } catch { /* plus tard */ }
  }))
}

function offlinePage() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · Équilibre</title>
<style>body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;background:#F6EEE3;color:#3B2A20;font-family:system-ui,sans-serif;padding:24px}
.c{max-width:360px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#6B5A4E;line-height:1.5}
a{display:inline-block;margin-top:16px;background:#B9552F;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700}
@media (prefers-color-scheme:dark){body{background:#1F1713;color:#F3E7DA}p{color:#BCA996}a{background:#E07A4F;color:#1F1713}}</style></head>
<body><div class="c"><h1>Pas de connexion</h1><p>Cette page a besoin du réseau. Ta liste de courses, elle, reste disponible.</p>
<a href="${COURSES}">Ouvrir ma liste de courses</a></div></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (isAsset(url)) {
    event.respondWith(cacheFirst(req))
    return
  }

  if (req.mode === 'navigate') {
    if (url.pathname === COURSES) {
      event.respondWith((async () => {
        try {
          const res = await fetch(req)
          // Seulement une vraie page (pas une redirection vers la connexion)
          if (res.ok && !res.redirected) event.waitUntil(storeCourses(res.clone()))
          return res
        } catch {
          return (await caches.match(COURSES, { cacheName: PAGES })) || offlinePage()
        }
      })())
      return
    }
    event.respondWith(fetch(req).catch(() => offlinePage()))
  }
})

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'warm-courses') {
    // Appelé à l'ouverture de l'appli (en ligne) : garde une copie récente de la liste
    event.waitUntil(fetch(COURSES, { credentials: 'same-origin' })
      .then((res) => (res.ok && !res.redirected ? storeCourses(res) : null))
      .catch(() => null))
  } else if (type === 'clear') {
    event.waitUntil(caches.delete(PAGES))
  }
})
