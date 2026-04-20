// ─── Garment ERP — Service Worker ─────────────────────────────────────────────
// Handles background Web Push notifications so users are notified even when
// the app tab is closed or the browser is minimised.

const CACHE_NAME = 'garment-erp-v1';

// ─── Install & Activate ───────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// ─── Push event ───────────────────────────────────────────────────────────────
// Fired when a Web Push message arrives from the server (Supabase Edge Function).
// Payload format (JSON):
//   { title, body, icon?, badge?, tag?, url?, category }

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try { data = event.data.json(); } catch { data = { title: 'New notification', body: event.data.text() }; }

    const title   = data.title   ?? 'Garment ERP';
    const options = {
        body:    data.body    ?? '',
        icon:    data.icon    ?? '/favicon.ico',
        badge:   data.badge   ?? '/favicon.ico',
        tag:     data.tag     ?? data.category ?? 'garment-erp',
        renotify: true,
        data:    { url: data.url ?? '/' },
        actions: [
            { action: 'open',    title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url ?? '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus an existing tab if one is open
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            return self.clients.openWindow(targetUrl);
        }),
    );
});

// ─── Background sync (future-ready) ───────────────────────────────────────────
// Register a sync tag from the app via:
//   navigator.serviceWorker.ready.then(r => r.sync.register('mark-notifications-read'))
// Then handle it here once connectivity is restored.

self.addEventListener('sync', (event) => {
    if (event.tag === 'mark-notifications-read') {
        // Placeholder — implement when offline-first support is needed
        event.waitUntil(Promise.resolve());
    }
});
