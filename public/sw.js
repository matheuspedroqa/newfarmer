// NewFarmer offline: guarda as páginas visitadas e os arquivos delas para abrir sem internet.
// Sempre tenta a internet primeiro; o guardado só aparece quando a rede falha.
// Os envios (diário, MyFarm) não passam por aqui: ficam na fila do aparelho (src/lib/outbox.ts).
const PAGES = "nf-pages-v1";
const ASSETS = "nf-assets-v1";
const META = "nf-meta";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function handled(request, url) {
  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/_next/webpack-hmr") &&
    !url.searchParams.has("_rsc") &&
    !request.headers.has("RSC")
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!handled(event.request, url)) return;
  if (event.request.mode === "navigate") event.respondWith(page(event.request));
  else if (url.pathname.startsWith("/_next/static/") || /\.(svg|png|ico|woff2?|css)$/.test(url.pathname)) event.respondWith(asset(event.request));
});

async function page(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await savePage(request.url, response.clone());
    return response;
  } catch {
    const cache = await caches.open(PAGES);
    return (
      (await cache.match(request.url, { ignoreVary: true })) ??
      (await cache.match(request.url, { ignoreVary: true, ignoreSearch: true })) ??
      offlinePage()
    );
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request.url, response.clone());
    return response;
  } catch {
    return (await cache.match(request.url, { ignoreVary: true })) ?? Response.error();
  }
}

// Guarda a página e os scripts e estilos que ela usa, para ela funcionar (e salvar) sem internet.
async function savePage(url, response) {
  const html = await response.clone().text();
  await (await caches.open(PAGES)).put(url, response);
  const assets = await caches.open(ASSETS);
  const files = new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")));
  await Promise.all(
    [...files].map(async (file) => {
      if (await assets.match(file)) return;
      try {
        const r = await fetch(file);
        if (r.ok) await assets.put(file, r);
      } catch {}
    }),
  );
}

async function warm(path) {
  try {
    let response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) return;
    if (response.redirected) {
      if (new URL(response.url).pathname === "/login") return; // acesso venceu: não guardar a tela de entrar no lugar da página
      response = new Response(await response.blob(), { status: response.status, headers: response.headers });
    }
    await savePage(new URL(path, self.location.origin).href, response);
  } catch {}
}

// Outra conta entrou neste aparelho: as páginas guardadas da anterior saem.
async function setOwner(owner) {
  const meta = await caches.open(META);
  const previous = await meta.match("/__owner");
  if (previous && (await previous.text()) === owner) return;
  await caches.delete(PAGES);
  await meta.put("/__owner", new Response(owner));
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "owner" && typeof data.owner === "string") event.waitUntil(setOwner(data.owner));
  if (data.type === "warm" && Array.isArray(data.paths)) event.waitUntil(Promise.all(data.paths.filter((p) => typeof p === "string" && p.startsWith("/")).map(warm)));
  if (data.type === "clear") event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(META)]));
});

function offlinePage() {
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NewFarmer</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;text-align:center;color:#24301f;background:#f6f1e7">
<p style="font-size:3rem;margin:0">🌱</p><h1>Sem internet</h1><p>Esta página ainda não foi guardada no aparelho. Volte para o Painel ou tente de novo quando a internet voltar.</p>
<p lang="en" style="color:#6b6b5f">No internet. This page has not been saved on this device yet.</p>
<p><a href="/painel" style="color:#3f6b3a;font-weight:700">Painel</a></p></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
