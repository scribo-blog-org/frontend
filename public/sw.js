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
            // Skip the push when the user is already looking at what it is
            // about: the same page, or the chat list for a chat message,
            // since the open messenger shows new messages by itself.
            const strip = (path) => path.replace(/\/+$/, '') || '/';
            const target = strip(new URL(url, self.location.origin).pathname);
            const isChat = target.startsWith('/messages/');
            const windows = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });
            // `client.url` is the address the window was opened with and does
            // not follow in-app navigation, so each window is asked where it
            // is now. A window that does not answer in time is not counted.
            const states = await Promise.all(
                windows.map(
                    (client) =>
                        new Promise((resolve) => {
                            const channel = new MessageChannel();
                            const timer = setTimeout(() => resolve(null), 500);
                            channel.port1.onmessage = (reply) => {
                                clearTimeout(timer);
                                resolve(reply.data);
                            };
                            client.postMessage({ type: 'push:where' }, [
                                channel.port2,
                            ]);
                        }),
                ),
            );
            const viewing = states.some((state) => {
                if (!state || !state.visible) {
                    return false;
                }
                const path = strip(state.path);
                return path === target || (isChat && path === '/messages');
            });
            console.log('[sw] push', { target, viewing, states });
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
