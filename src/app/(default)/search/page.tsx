import type { Metadata } from "next";

import SearchPage from "@/views/Search";
import { buildMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Поиск",
    description: "Поиск статей и авторов на Scribo.",
    path: "/search",
});

export default function SearchRoute() {
    return <SearchPage />;
}
