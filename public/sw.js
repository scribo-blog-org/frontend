self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
    event.waitUntil(self.clients.claim()),
);

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : '' };
    }

    const url = data.url || '/';

    event.waitUntil(
        (async () => {
            // The user is already looking at the page this would open.
            const windows = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });
            const viewing = windows.some(
                (client) =>
                    client.focused &&
                    client.visibilityState === 'visible' &&
                    new URL(client.url).pathname ===
                        new URL(url, self.location.origin).pathname,
            );
            if (viewing) {
                return;
            }

            await self.registration.showNotification(data.title || 'Scribo', {
                body: data.body || '',
                tag: data.tag,
                renotify: Boolean(data.tag),
                icon: data.icon || '/logo-192.png',
                badge: '/logo-192.png',
                data: { url },
            });
        })(),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });
            const existing = windows.find((client) =>
                client.url.startsWith(self.location.origin),
            );

            if (existing) {
                await existing.focus();
                existing.postMessage({ type: 'push:navigate', url });
                return;
            }

            await self.clients.openWindow(url);
        })(),
    );
});
