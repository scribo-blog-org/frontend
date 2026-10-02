import type { Metadata } from 'next';

import HomePage from '@/views/HomePage';
import { POSTS_PAGE_LIMIT } from '@/api/posts.api';
import { buildMetadata } from '@/lib/metadata';
import { fetchPosts } from '@/lib/server-api';
import { HOME_TITLE, SITE_DESCRIPTION } from '@/seo/site';

export const dynamic = 'force-dynamic';

type HomeRouteProps = {
    searchParams: Promise<{ filter?: string | string[] }>;
};

export async function generateMetadata({
    searchParams,
}: HomeRouteProps): Promise<Metadata> {
    const params = await searchParams;
    const filter = Array.isArray(params.filter)
        ? params.filter[0]
        : params.filter;

    return buildMetadata({
        absoluteTitle: HOME_TITLE,
        description: SITE_DESCRIPTION,
        path: '/',
        noindex: Boolean(filter?.trim()),
        follow: true,
    });
}

export default async function HomeRoute({ searchParams }: HomeRouteProps) {
    const params = await searchParams;
    const filter = Array.isArray(params.filter)
        ? params.filter[0]
        : params.filter;
    const initial = filter?.trim() ? null : await loadFeed();

    return (
        <HomePage
            initialPosts={initial?.items || []}
            initialPagesCount={initial?.pages || 0}
        />
    );
}

async function loadFeed() {
    const result = await fetchPosts({
        expand: 'author,category',
        page: 1,
        limit: POSTS_PAGE_LIMIT,
    });
    const payload = result.status ? result.data : null;
    const items = Array.isArray(payload?.items) ? payload.items : [];

    return {
        items,
        pages: Number(payload?.pagination?.pages || 0),
    };
}
