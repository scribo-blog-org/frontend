import { apiUrl } from "../config";

let accessToken: any = null;
let refreshPromise: any = null;
let authGeneration = 0;
let backendAvailable = true;
const listeners = new Set();
const backendListeners = new Set();

function isServerErrorStatus(status: any) {
    return status >= 500 && status <= 599;
}

export function subscribeBackendAvailability(listener: any) {
    backendListeners.add(listener);
    return () => {
        backendListeners.delete(listener);
    };
}

export function markBackendUnavailable() {
    if (backendAvailable) {
        backendAvailable = false;
        backendListeners.forEach((listener: any) => listener(false));
    }
}

export function markBackendAvailable() {
    if (!backendAvailable) {
        backendAvailable = true;
        backendListeners.forEach((listener: any) => listener(true));
    }
}

export async function probeBackend() {
    try {
        const response = await fetch(`${apiUrl()}/health`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            markBackendUnavailable();
            return false;
        }

        markBackendAvailable();
        return true;
    } catch {
        markBackendUnavailable();
        return false;
    }
}

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token: any) {
    accessToken = token || null;
    authGeneration += 1;
    listeners.forEach((listener: any) => listener(accessToken));
}

export function subscribeAccessToken(listener: any) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function isAuthRefreshUrl(url: any) {
    return typeof url === "string" && url.includes("/api/auth/refresh");
}

async function parseJson(response: any) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    const generation = authGeneration;

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${apiUrl()}/api/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });
            if (isServerErrorStatus(response.status)) {
                markBackendUnavailable();
                return getAccessToken();
            }

            const result = await parseJson(response);

            if (generation !== authGeneration) {
                return getAccessToken();
            }

            if (!response.ok || !result?.data?.accessToken) {
                setAccessToken(null);
                return null;
            }

            setAccessToken(result.data.accessToken);
            return result.data.accessToken;
        } catch {
            if (generation !== authGeneration) {
                return getAccessToken();
            }

            markBackendUnavailable();
            return getAccessToken();
        }
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export async function apiFetch(url: any, options: any = {}) {
    const { skipAuth, _retry, reportOutage = true, headers: initHeaders, ...rest } = options;
    const headers = new Headers(initHeaders || {});
    const token = getAccessToken();

    if (!skipAuth && token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: any;

    try {
        response = await fetch(url, {
            ...rest,
            headers,
            credentials: "include",
        });
    } catch (error: any) {
        if (reportOutage) {
            markBackendUnavailable();
        }
        throw error;
    }

    if (reportOutage && isServerErrorStatus(response.status)) {
        markBackendUnavailable();
    }

    if (
        response.status === 401 &&
        !_retry &&
        !skipAuth &&
        !isAuthRefreshUrl(url)
    ) {
        const nextToken = await refreshAccessToken();

        if (nextToken) {
            return apiFetch(url, { ...options, _retry: true });
        }
    }

    return response;
}
