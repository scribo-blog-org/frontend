const PUBLIC_ENV_KEYS = [
    "NEXT_PUBLIC_APP_API_URL",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL",
    "NEXT_PUBLIC_SOCKET_URL",
];

function readProcessEnv(key) {
    return process.env[key] ?? "";
}

export function publicEnv(key) {
    if (typeof window !== "undefined" && window.__SCRIBO_ENV) {
        return window.__SCRIBO_ENV[key] ?? "";
    }

    return readProcessEnv(key);
}

export function publicEnvBootScript() {
    const payload = {};

    for (const key of PUBLIC_ENV_KEYS) {
        payload[key] = readProcessEnv(key);
    }

    return `window.__SCRIBO_ENV=${JSON.stringify(payload).replace(/</g, "\\u003c")}`;
}
