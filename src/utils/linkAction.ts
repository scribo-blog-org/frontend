import type { LinkInfo } from './embed';

export type LinkAction = 'link-selection' | 'media' | 'text' | 'invalid';

export type DetectedMedia = 'image' | 'gif' | 'video';

const KNOWN_MEDIA_KINDS = new Set([
    'youtube',
    'vimeo',
    'twitch',
    'image',
    'video',
]);

export function asDetectedMedia(value: unknown): DetectedMedia | null {
    return value === 'image' || value === 'gif' || value === 'video'
        ? value
        : null;
}

export function decideLinkAction(
    hasSelection: boolean,
    info: LinkInfo | null,
    detectedMedia?: unknown,
): LinkAction {
    if (!info) {
        return 'invalid';
    }

    if (hasSelection) {
        return 'link-selection';
    }

    if (KNOWN_MEDIA_KINDS.has(info.kind) || asDetectedMedia(detectedMedia)) {
        return 'media';
    }

    return 'text';
}

export function linkHref(value: string, info: LinkInfo): string {
    const typed = String(value || '').trim();
    return /^https?:\/\//i.test(typed) ? typed : info.url;
}
