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

/**
 * Decides what the composer's single link button does with a URL.
 *
 * - selected text: it always becomes a hyperlink, whatever the URL is;
 * - no selection and the URL is a player or a direct media file (known from
 *   the URL itself or from the server's content-type sniff): carousel media;
 * - anything else: inserted into the text as a plain URL.
 */
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

/** The URL as typed when it already has a scheme, otherwise the normalised one. */
export function linkHref(value: string, info: LinkInfo): string {
    const typed = String(value || '').trim();
    return /^https?:\/\//i.test(typed) ? typed : info.url;
}
