import { notFound } from "next/navigation";

import Article from "@/views/Article";
import { buildMetadata } from "@/lib/metadata";
import { fetchPostById } from "@/lib/server-api";
import { plainTextExcerpt } from "@/seo/excerpt";

export async function generateMetadata({ params }) {
    const { id } = await params;
    const result = await fetchPostById(id, { expand: "author,category" });
    const article = result?.status ? result.data : null;

    if (!article?._id) {
        return buildMetadata({
            title: "Статья не найдена",
            path: `/posts/${id}`,
            noindex: true,
        });
    }

    return buildMetadata({
        title: article.title,
        description: plainTextExcerpt(article.content_text) || article.title,
        path: `/posts/${article._id}`,
        image: article.featured_image || undefined,
        type: "article",
    });
}

export default async function ArticlePage({ params, searchParams }) {
    const { id } = await params;
    const query = await searchParams;
    const result = await fetchPostById(id, { expand: "author,category" });
    const article = result?.status ? result.data : null;

    if (!article?._id) {
        notFound();
    }

    return (
        <Article
            initialArticle={article}
            initialComment={query?.comment || null}
        />
    );
}
