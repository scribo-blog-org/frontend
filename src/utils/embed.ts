export type LinkKind =
    'youtube' | 'vimeo' | 'twitch' | 'image' | 'video' | 'unknown';

export type LinkInfo = {
    kind: LinkKind;
    url: string;
    embedUrl?: string;
    thumbnail?: string;
    id?: string;
};

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
]);

const TWITCH_HOSTS = new Set(['twitch.tv', 'www.twitch.tv', 'm.twitch.tv']);

const TWITCH_RESERVED = new Set([
    'directory',
    'videos',
    'settings',
    'p',
    'downloads',
    'jobs',
    'turbo',
    'store',
    'subscriptions',
    'wallet',
    'friends',
    'messages',
    'drops',
    'search',
    'popout',
    'embed',
    'clip',
    'moderator',
    'u',
    'user',
    'broadcast',
]);

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif)$/i;
const VIDEO_EXTENSION = /\.(mp4|webm|mov)$/i;

export function parseHttpUrl(value: unknown): URL | null {
    const raw = String(value || '').trim();
    if (!raw) {
        return null;
    }

    try {
        const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        if (!url.hostname.includes('.')) {
            return null;
        }
        return url;
    } catch {
        return null;
    }
}

function youtubeId(url: URL) {
    const host = url.hostname.toLowerCase();

    if (host === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (!YOUTUBE_HOSTS.has(host)) {
        return null;
    }

    if (url.pathname === '/watch') {
        return url.searchParams.get('v');
    }

    const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    return match ? match[1] : null;
}

function vimeoId(url: URL) {
    const host = url.hostname.toLowerCase();

    if (host !== 'vimeo.com' && host !== 'www.vimeo.com') {
        if (host === 'player.vimeo.com') {
            const match = url.pathname.match(/^\/video\/(\d+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    const match = url.pathname.match(/\/(\d{5,})(?:\/|$)/);
    return match ? match[1] : null;
}

export type TwitchRef =
    | { type: 'video'; id: string }
    | { type: 'clip'; id: string }
    | { type: 'channel'; id: string };

export function twitchRef(url: URL): TwitchRef | null {
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'clips.twitch.tv') {
        if (segments[0] === 'embed') {
            const clip = url.searchParams.get('clip');
            return clip && /^[\w-]{3,100}$/.test(clip)
                ? { type: 'clip', id: clip }
                : null;
        }
        return segments[0] && /^[\w-]{3,100}$/.test(segments[0])
            ? { type: 'clip', id: segments[0] }
            : null;
    }

    if (!TWITCH_HOSTS.has(host) || !segments.length) {
        return null;
    }

    if (segments[0].toLowerCase() === 'videos') {
        return /^\d+$/.test(segments[1] || '')
            ? { type: 'video', id: segments[1] }
            : null;
    }

    if (
        segments.length >= 3 &&
        segments[1].toLowerCase() === 'clip' &&
        /^[\w-]{3,100}$/.test(segments[2])
    ) {
        return { type: 'clip', id: segments[2] };
    }

    const login = segments[0];
    if (
        segments.length === 1 &&
        /^\w{2,25}$/.test(login) &&
        !TWITCH_RESERVED.has(login.toLowerCase())
    ) {
        return { type: 'channel', id: login };
    }

    return null;
}

export function twitchEmbedUrl(ref: TwitchRef) {
    if (ref.type === 'video') {
        return `https://player.twitch.tv/?video=v${ref.id}`;
    }
    if (ref.type === 'clip') {
        return `https://clips.twitch.tv/embed?clip=${ref.id}`;
    }
    return `https://player.twitch.tv/?channel=${ref.id}`;
}

export function withTwitchParent(embedUrl: string, hostname: string) {
    if (!hostname) {
        return embedUrl;
    }
    try {
        const url = new URL(embedUrl);
        if (
            url.hostname !== 'player.twitch.tv' &&
            url.hostname !== 'clips.twitch.tv'
        ) {
            return embedUrl;
        }
        url.searchParams.delete('parent');
        url.searchParams.append('parent', hostname);
        return url.toString();
    } catch {
        return embedUrl;
    }
}
export function classifyLink(value: unknown): LinkInfo | null {
    const url = parseHttpUrl(value);
    if (!url) {
        return null;
    }

    const href = url.toString();

    const yt = youtubeId(url);
    if (yt && /^[\w-]{6,20}$/.test(yt)) {
        return {
            kind: 'youtube',
            url: href,
            id: yt,
            embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
            thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
        };
    }

    const vm = vimeoId(url);
    if (vm) {
        return {
            kind: 'vimeo',
            url: href,
            id: vm,
            embedUrl: `https://player.vimeo.com/video/${vm}`,
        };
    }

    const tw = twitchRef(url);
    if (tw) {
        return {
            kind: 'twitch',
            url: href,
            id: tw.id,
            embedUrl: twitchEmbedUrl(tw),
        };
    }

    if (IMAGE_EXTENSION.test(url.pathname)) {
        return { kind: 'image', url: href };
    }

    if (VIDEO_EXTENSION.test(url.pathname)) {
        return { kind: 'video', url: href };
    }

    return { kind: 'unknown', url: href };
}

export function isEmbedProvider(provider: unknown) {
    return (
        provider === 'youtube' ||
        provider === 'vimeo' ||
        provider === 'dailymotion' ||
        provider === 'twitch'
    );
}

const SAFE_EMBED_HOSTS = new Set([
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'www.dailymotion.com',
    'player.twitch.tv',
    'clips.twitch.tv',
]);

export function isSafeEmbedUrl(value: unknown) {
    try {
        const url = new URL(String(value || ''));
        return url.protocol === 'https:' && SAFE_EMBED_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
}

export function hostLabel(value: unknown) {
    const url = parseHttpUrl(value);
    return url ? url.hostname.replace(/^www\./, '') : '';
}

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
};

export function decodeEntities(value: unknown): string {
    return String(value ?? '').replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (match, entity: string) => {
            if (entity[0] === '#') {
                const code =
                    entity[1].toLowerCase() === 'x'
                        ? parseInt(entity.slice(2), 16)
                        : parseInt(entity.slice(1), 10);
                if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) {
                    return match;
                }
                try {
                    return String.fromCodePoint(code);
                } catch {
                    return match;
                }
            }
            return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
        },
    );
}
