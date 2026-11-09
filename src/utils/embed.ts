export type LinkKind = 'youtube' | 'vimeo' | 'image' | 'video' | 'link';

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

    if (IMAGE_EXTENSION.test(url.pathname)) {
        return { kind: 'image', url: href };
    }

    if (VIDEO_EXTENSION.test(url.pathname)) {
        return { kind: 'video', url: href };
    }

    return { kind: 'link', url: href };
}

export function isEmbedProvider(provider: unknown) {
    return provider === 'youtube' || provider === 'vimeo';
}

const SAFE_EMBED_HOSTS = new Set([
    'www.youtube-nocookie.com',
    'player.vimeo.com',
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
