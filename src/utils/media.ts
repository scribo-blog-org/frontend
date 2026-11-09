const configuredMb = Number(process.env.NEXT_PUBLIC_POST_MEDIA_MAX_MB);

export const MAX_MEDIA_MB =
    Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb : 100;
export const MAX_MEDIA_BYTES = Math.floor(MAX_MEDIA_MB * 1024 * 1024);

export const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const MEDIA_ACCEPT = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(
    ',',
);

export type MediaKind = 'image' | 'gif' | 'video';

export function mediaKindFromMime(mime: unknown): MediaKind | null {
    const value = String(mime || '').toLowerCase();

    if (value === 'image/gif') {
        return 'gif';
    }

    if (IMAGE_MIME_TYPES.includes(value)) {
        return 'image';
    }

    if (VIDEO_MIME_TYPES.includes(value)) {
        return 'video';
    }

    return null;
}

export function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '0 B';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function validateMediaFile(file: {
    type?: string;
    size?: number;
}): string | null {
    if (!file || !mediaKindFromMime(file.type)) {
        return 'Unsupported file type. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or MOV.';
    }

    if (!file.size) {
        return 'The file is empty.';
    }

    if (file.size > MAX_MEDIA_BYTES) {
        return `The file is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_MEDIA_BYTES)}.`;
    }

    return null;
}
