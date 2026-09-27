import type { Metadata } from "next";

import SearchPage from "@/views/Search";
import { buildMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

type SearchRouteProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: SearchRouteProps): Promise<Metadata> {
    const params = await searchParams;
    const query = Array.isArray(params.q) ? params.q[0] : params.q;

    return buildMetadata({
        title: "Поиск",
        description: "Поиск статей и авторов на Scribo.",
        path: "/search",
        noindex: Boolean(query?.trim()),
        follow: true,
    });
}

export default function SearchRoute() {
    return <SearchPage />;
}
