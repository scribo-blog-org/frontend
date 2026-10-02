import { notFound } from 'next/navigation';

import Article from '@/views/Article';
import { buildMetadata } from '@/lib/metadata';
import { loadPublicPost } from '@/lib/server-api';
import { plainTextExcerpt } from '@/seo/excerpt';

export const dynamic = 'force-dynamic';

type ArticleRouteProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ArticleRouteProps) {
    const { id } = await params;
    const result = await loadPublicPost(id);
    const article = result.status ? result.data : null;

    if (!article?._id) {
        return buildMetadata({
            title: 'Article not found',
            path: `/posts/${id}`,
            noindex: true,
        });
    }

    const title = typeof article.title === 'string' ? article.title : 'Article';
    const text =
        typeof article.content_text === 'string' ? article.content_text : '';
    const image =
        typeof article.featured_image === 'string'
            ? article.featured_image
            : undefined;
    const author = articleAuthor(article);
    const publishedTime = isoDate(article.created_date);

    return buildMetadata({
        title,
        description: plainTextExcerpt(text) || title,
        path: `/posts/${String(article._id)}`,
        image,
        type: 'article',
        publishedTime,
        modifiedTime: publishedTime,
        authors: author?.name ? [author.name] : undefined,
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

function isoDate(value: unknown) {
    if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        !(value instanceof Date)
    ) {
        return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function articleAuthor(article: Record<string, unknown>) {
    const author = article.author;

    if (!author || typeof author !== 'object') {
        return null;
    }

    const record = author as Record<string, unknown>;
    const name = typeof record.nick_name === 'string' ? record.nick_name : '';

    if (!name) {
        return null;
    }

    return { name };
}
