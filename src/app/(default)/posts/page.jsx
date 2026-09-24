import HomePage from "@/views/HomePage";
import { buildMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION } from "@/seo/site";
import { fetchCategories, fetchPosts } from "@/lib/server-api";

export const metadata = buildMetadata({
    title: "Главная",
    description: SITE_DESCRIPTION,
    path: "/posts",
});

export default async function PostsPage({ searchParams }) {
    const params = await searchParams;
    const filter = String(params?.filter || "");
    const filtersFromUrl = filter
        .split(",")
        .map((item) => item.toLowerCase())
        .filter(Boolean);

    const [postsResult, categoriesResult] = await Promise.all([
        fetchPosts({
            expand: "author,category",
            page: 1,
            limit: 5,
        }),
        fetchCategories(),
    ]);

    const useInitialFeed = filtersFromUrl.length === 0 && postsResult.response?.status === true;

    return (
        <HomePage
            initialPosts={useInitialFeed ? postsResult.items : undefined}
            initialPagination={useInitialFeed ? postsResult.pagination : undefined}
            initialCategories={Array.isArray(categoriesResult?.data) ? categoriesResult.data : []}
        />
    );
}
