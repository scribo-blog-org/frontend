import { apiUrl } from '../config';
import {
    getAccessToken,
    markBackendUnavailable,
    refreshAccessToken,
} from './http';

export type PostFormOptions = {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
};

type RawResponse = { code: number; body: any };

class UploadAborted extends Error {}

export function uploadPercent(loaded: number, total: number) {
    if (!total || total <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
}

function send(
    method: 'POST' | 'PATCH',
    url: string,
    form: FormData,
    token: string | null,
    options: PostFormOptions,
): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
        const { onProgress, signal } = options;

        if (signal?.aborted) {
            reject(new UploadAborted());
            return;
        }

        const request = new XMLHttpRequest();
        request.open(method, url);
        request.withCredentials = true;

        if (token) {
            request.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress?.(uploadPercent(event.loaded, event.total));
            }
        };

        request.onload = () => {
            let body: any = null;
            try {
                body = JSON.parse(request.responseText);
            } catch {}
            resolve({ code: request.status, body });
        };
        request.onerror = () => reject(new Error('Network error'));
        request.onabort = () => reject(new UploadAborted());

        signal?.addEventListener('abort', () => request.abort(), {
            once: true,
        });

        request.send(form);
    });
}

export async function sendPostForm(
    method: 'POST' | 'PATCH',
    path: string,
    form: FormData,
    options: PostFormOptions = {},
) {
    const url = `${apiUrl()}${path}`;

    try {
        let response = await send(method, url, form, getAccessToken(), options);

        if (response.code === 401) {
            const token = await refreshAccessToken();
            if (token) {
                response = await send(method, url, form, token, options);
            }
        }

        if (response.code >= 500) {
            markBackendUnavailable();
        }

        options.onProgress?.(100);

        return {
            statusCode: response.code,
            ...(response.body ?? {
                status: false,
                message: 'Unexpected response from the server.',
            }),
        };
    } catch (error) {
        if (error instanceof UploadAborted) {
            return {
                statusCode: 0,
                status: false,
                aborted: true,
                message: 'Upload cancelled',
            };
        }

        markBackendUnavailable();

        return {
            statusCode: 0,
            status: false,
            message: 'Network error. Check your connection and try again.',
        };
    }
}
