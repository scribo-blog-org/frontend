const PUBLIC_ENV_KEYS = [
    'NEXT_PUBLIC_APP_API_URL',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL',
    'NEXT_PUBLIC_SOCKET_URL',
];

function readProcessEnv(key) {
    return process.env[key] ?? '';
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// In development the API and socket addresses point at localhost, which means
// the phone itself when the site is opened from another device. There the
// page's own host is used instead, so one env file works for the Mac and the
// phone, and the API stays on the same site as the page for cookies.
function followPageHost(key, value) {
    if (
        typeof window === 'undefined' ||
        process.env.NODE_ENV === 'production' ||
        !value ||
        (key !== 'NEXT_PUBLIC_APP_API_URL' && key !== 'NEXT_PUBLIC_SOCKET_URL')
    ) {
        return value;
    }

    const pageHost = window.location.hostname;

    if (!pageHost || LOCAL_HOSTS.includes(pageHost)) {
        return value;
    }

    try {
        const url = new URL(value);

        if (!LOCAL_HOSTS.includes(url.hostname)) {
            return value;
        }

        url.hostname = pageHost;
        return url.toString().replace(/\/$/, '');
    } catch {
        return value;
    }
}

export function publicEnv(key) {
    if (typeof window !== 'undefined' && window.__SCRIBO_ENV) {
        return followPageHost(key, window.__SCRIBO_ENV[key] ?? '');
    }

    return followPageHost(key, readProcessEnv(key));
}

// True when development points at an API on this machine. Uploaded files are
// then served through the page's own origin (see the `/uploads` rewrite in
// next.config.mjs), so they load on any device that can open the page.
export function usesLocalDevApi() {
    if (process.env.NODE_ENV === 'production') {
        return false;
    }

    const raw =
        typeof window !== 'undefined' && window.__SCRIBO_ENV
            ? window.__SCRIBO_ENV.NEXT_PUBLIC_APP_API_URL
            : process.env.NEXT_PUBLIC_APP_API_URL;

    try {
        return LOCAL_HOSTS.includes(new URL(raw || '').hostname);
    } catch {
        return false;
    }
}

export function publicEnvBootScript() {
    const payload = {};

    for (const key of PUBLIC_ENV_KEYS) {
        payload[key] = readProcessEnv(key);
    }

    return `window.__SCRIBO_ENV=${JSON.stringify(payload).replace(/</g, '\\u003c')}`;
}
