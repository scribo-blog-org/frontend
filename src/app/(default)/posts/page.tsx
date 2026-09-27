import type { Metadata } from "next";

import HomePage from "@/views/HomePage";
import { POSTS_PAGE_LIMIT } from "@/api/posts.api";
import { buildMetadata } from "@/lib/metadata";
import { fetchPosts } from "@/lib/server-api";
import { SITE_DESCRIPTION } from "@/seo/site";

const HOME_TITLE = "Scribo: Главная";

export const dynamic = "force-dynamic";

type PostsRouteProps = {
    searchParams: Promise<{ filter?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PostsRouteProps): Promise<Metadata> {
    const params = await searchParams;
    const filter = Array.isArray(params.filter) ? params.filter[0] : params.filter;

    const metadata = buildMetadata({
        description: SITE_DESCRIPTION,
        path: "/posts",
        noindex: Boolean(filter?.trim()),
        follow: true,
    });

    if (filter?.trim()) {
        return metadata;
    }

    return {
        ...metadata,
        title: HOME_TITLE,
        openGraph: {
            ...metadata.openGraph,
            title: HOME_TITLE,
        },
        twitter: {
            ...metadata.twitter,
            title: HOME_TITLE,
        },
    };
}

export default async function PostsPage({ searchParams }: PostsRouteProps) {
    const params = await searchParams;
    const filter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
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
        expand: "author,category",
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
