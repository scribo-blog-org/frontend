const PUBLIC_ENV_KEYS = [
    'NEXT_PUBLIC_APP_API_URL',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL',
    'NEXT_PUBLIC_SOCKET_URL',
] as const;

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];

declare global {
    interface Window {
        __SCRIBO_ENV?: Partial<Record<PublicEnvKey, string>>;
    }
}

function readProcessEnv(key: PublicEnvKey) {
    return process.env[key] ?? '';
}

export function publicEnv(key: PublicEnvKey) {
    if (typeof window !== 'undefined' && window.__SCRIBO_ENV) {
        return window.__SCRIBO_ENV[key] ?? '';
    }

    return readProcessEnv(key);
}

export function publicEnvBootScript() {
    const payload: Partial<Record<PublicEnvKey, string>> = {};

    for (const key of PUBLIC_ENV_KEYS) {
        payload[key] = readProcessEnv(key);
    }

    return `window.__SCRIBO_ENV=${JSON.stringify(payload).replace(/</g, '\\u003c')}`;
}
