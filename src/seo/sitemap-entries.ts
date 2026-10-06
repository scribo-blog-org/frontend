import type { MetadataRoute } from 'next';

import { apiUrl } from '@/config';
import { absoluteUrl } from '@/seo/site';
import { mediaUrl } from '@/utils/image';

export type SitemapEntry = MetadataRoute.Sitemap[number];

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    return value as Record<string, unknown>;
}

function isoDate(value: unknown) {
    if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        !(value instanceof Date)
    ) {
        return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
}

async function fetchJson(path: string) {
    const base = apiUrl().replace(/\/$/, '');

    if (!base) {
        return null;
    }

    try {
        const response = await fetch(`${base}${path}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

export async function postEntries(): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    let page = 1;
    let pages = 1;

    while (page <= pages && page <= 100) {
        const result = asRecord(
            await fetchJson(`/api/posts?page=${page}&limit=50`),
        );

        if (!result?.status) {
            break;
        }

        const payload = asRecord(result.data);
        const items = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(result.data)
              ? result.data
              : [];
        const pagination = asRecord(payload?.pagination);
        pages = Number(pagination?.pages || 1);

        for (const item of items) {
            const post = asRecord(item);
            const id = post?._id ? String(post._id) : '';

            if (!post || !id) {
                continue;
            }

            const image =
                typeof post.featured_image === 'string'
                    ? mediaUrl(post.featured_image)
                    : '';

            entries.push({
                url: absoluteUrl(`/posts/${id}`),
                lastModified: isoDate(post.created_date),
                changeFrequency: 'weekly',
                priority: 0.8,
                ...(image ? { images: [image] } : {}),
            });
        }

        page += 1;
    }

    return entries;
}

export async function profileEntries(): Promise<SitemapEntry[]> {
    const result = asRecord(await fetchJson('/api/users/'));

    if (!result?.status || !Array.isArray(result.data)) {
        return [];
    }

    const entries: SitemapEntry[] = [];

    for (const item of result.data) {
        const user = asRecord(item);
        const nick =
            typeof user?.nick_name === 'string' ? user.nick_name.trim() : '';

        if (!user || !nick) {
            continue;
        }

        entries.push({
            url: absoluteUrl(`/users/${encodeURIComponent(nick)}`),
            lastModified:
                isoDate(user.last_activity_at) || isoDate(user.created_date),
            changeFrequency: 'weekly',
            priority: 0.5,
        });
    }

    return entries;
}

export function staticEntries(): SitemapEntry[] {
    return [
        {
            url: absoluteUrl('/'),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: absoluteUrl('/search'),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: absoluteUrl('/support'),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];
}

export async function allEntries(): Promise<SitemapEntry[]> {
    const [posts, profiles] = await Promise.all([
        postEntries(),
        profileEntries(),
    ]);

    return [...staticEntries(), ...posts, ...profiles];
}
