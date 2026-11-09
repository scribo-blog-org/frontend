import { apiUrl } from '../config';
import { getAccessToken, refreshAccessToken } from './http';

export type UploadedMedia = {
    type: 'image' | 'gif' | 'video';
    url: string;
    mime?: string;
    size?: number;
};

type UploadResult =
    { status: true; data: UploadedMedia } | { status: false; message: string };

function send(
    file: File,
    token: string | null,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<{ code: number; body: any }> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${apiUrl()}/api/posts/media`);
        request.withCredentials = true;

        if (token) {
            request.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress?.(Math.round((event.loaded / event.total) * 100));
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
        request.onabort = () => reject(new Error('Upload cancelled'));

        if (signal) {
            if (signal.aborted) {
                reject(new Error('Upload cancelled'));
                return;
            }
            signal.addEventListener('abort', () => request.abort(), {
                once: true,
            });
        }

        const form = new FormData();
        form.append('file', file);
        request.send(form);
    });
}

function errorMessage(body: any, code: number) {
    const fieldMessage = body?.errors?.body?.file?.message;
    if (typeof fieldMessage === 'string') {
        return fieldMessage;
    }
    if (typeof body?.message === 'string') {
        return body.message;
    }
    if (code === 413) {
        return 'The file is too large.';
    }
    return 'Could not upload the file.';
}

export async function uploadPostMedia(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<UploadResult> {
    try {
        let response = await send(file, getAccessToken(), onProgress, signal);

        if (response.code === 401) {
            const token = await refreshAccessToken();
            if (token) {
                response = await send(file, token, onProgress, signal);
            }
        }

        if (response.code >= 200 && response.code < 300 && response.body) {
            const data = response.body.data ?? response.body;
            if (data?.url && data?.type) {
                return { status: true, data };
            }
        }

        return {
            status: false,
            message: errorMessage(response.body, response.code),
        };
    } catch (error: any) {
        return {
            status: false,
            message: error?.message || 'Could not upload the file.',
        };
    }
}
