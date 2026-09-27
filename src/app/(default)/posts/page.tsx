import type { Metadata } from "next";

import HomePage from "@/views/HomePage";
import { buildMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION } from "@/seo/site";

export const dynamic = "force-dynamic";

type PostsRouteProps = {
    searchParams: Promise<{ filter?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PostsRouteProps): Promise<Metadata> {
    const params = await searchParams;
    const filter = Array.isArray(params.filter) ? params.filter[0] : params.filter;

    return buildMetadata({
        description: SITE_DESCRIPTION,
        path: "/posts",
        noindex: Boolean(filter?.trim()),
        follow: true,
    });
}

export default function PostsPage() {
    return <HomePage />;
}
