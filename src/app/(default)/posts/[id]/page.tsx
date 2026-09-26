import { notFound } from "next/navigation";

import Article from "@/views/Article";
import { buildMetadata } from "@/lib/metadata";
import { loadPublicPost } from "@/lib/server-api";
import { plainTextExcerpt } from "@/seo/excerpt";

export const dynamic = "force-dynamic";

type ArticleRouteProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ArticleRouteProps) {
    const { id } = await params;
    const result = await loadPublicPost(id);
    const article = result.status ? result.data : null;

    if (!article?._id) {
        return buildMetadata({
            title: "Статья не найдена",
            path: `/posts/${id}`,
            noindex: true,
        });
    }

    const title = typeof article.title === "string" ? article.title : "Статья";
    const text = typeof article.content_text === "string" ? article.content_text : "";
    const image = typeof article.featured_image === "string" ? article.featured_image : undefined;

    return buildMetadata({
        title,
        description: plainTextExcerpt(text) || title,
        path: `/posts/${String(article._id)}`,
        image,
        type: "article",
    });
}

export default async function ArticlePage({ params }: ArticleRouteProps) {
    const { id } = await params;
    const result = await loadPublicPost(id);

    if (!result.status || !result.data?._id) {
        notFound();
    }

    return <Article initialArticle={result.data} />;
}
