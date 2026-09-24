import SearchPage from "@/views/Search";
import { buildMetadata } from "@/lib/metadata";
import { fetchSearch } from "@/lib/server-api";

export const metadata = buildMetadata({
    title: "Поиск",
    description: "Поиск статей и авторов на Scribo.",
    path: "/search",
});

export default async function SearchRoute({ searchParams }) {
    const params = await searchParams;
    const q = String(params?.q || "");
    const result = await fetchSearch(q);

    return (
        <SearchPage
            initialQuery={q}
            initialResults={result?.data || { posts: [], users: [], categories: [] }}
        />
    );
}
