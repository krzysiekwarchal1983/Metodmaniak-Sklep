// Deliberately network-only: never cache accounts, API results or trial access.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MetodManiak — brak połączenia</title><body style="margin:0;padding:32px;background:#0f110e;color:#e8eedd;font-family:system-ui"><h1 style="color:#ccff00">Jesteś offline</h1><p>Aplikacja MetodManiak wymaga połączenia z Internetem, aby sprawdzić dostęp i pobrać aktualne dane.</p><button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:24px;background:#ccff00;color:#0f110e">Spróbuj ponownie</button></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
