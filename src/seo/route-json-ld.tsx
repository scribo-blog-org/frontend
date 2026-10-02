import { headers } from 'next/headers';

import { loadPublicPost, loadPublicProfile } from '@/lib/server-api';
import { plainTextExcerpt } from '@/seo/excerpt';
import { JsonLd } from '@/seo/json-ld';
import {
    BRAND_LOGO,
    DEFAULT_OG_IMAGE,
    SITE_NAME,
    absoluteUrl,
} from '@/seo/site';
import { mediaUrl } from '@/utils/image';

function asString(value: unknown) {
    return typeof value === 'string' ? value : '';
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

async function postJsonLd(id: string) {
    const result = await loadPublicPost(id);
    const article = result.status ? result.data : null;

    if (!article?._id) {
        return null;
    }

    const title = asString(article.title) || 'Статья';
    const description =
        plainTextExcerpt(asString(article.content_text)) || title;
    const featured = asString(article.featured_image);
    const image = featured ? mediaUrl(featured) : absoluteUrl(DEFAULT_OG_IMAGE);
    const published = isoDate(article.created_date);
    const url = absoluteUrl(`/posts/${String(article._id)}`);
    const authorRecord =
        article.author && typeof article.author === 'object'
            ? (article.author as Record<string, unknown>)
            : null;
    const authorName = asString(authorRecord?.nick_name);
    const categoryRecord =
        article.category && typeof article.category === 'object'
            ? (article.category as Record<string, unknown>)
            : null;
    const category = asString(categoryRecord?.name);

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        inLanguage: 'ru',
        mainEntityOfPage: url,
        url,
        image,
        ...(published
            ? { datePublished: published, dateModified: published }
            : {}),
        ...(category ? { articleSection: category } : {}),
        author: authorName
            ? {
                  '@type': 'Person',
                  name: authorName,
                  url: absoluteUrl(`/users/${encodeURIComponent(authorName)}`),
              }
            : { '@type': 'Organization', name: SITE_NAME },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: absoluteUrl(BRAND_LOGO),
            },
        },
    };
}

async function profileJsonLd(id: string) {
    const result = await loadPublicProfile(id);
    const user = result.status ? result.data?.[0] : null;

    if (!user) {
        return null;
    }

    const name = asString(user.nick_name) || asString(user.login) || 'Профиль';
    const nick = asString(user.nick_name) || id;
    const description =
        asString(user.description) || `Профиль ${name} на Scribo`;
    const avatar = asString(user.avatar);
    const url = absoluteUrl(`/users/${encodeURIComponent(nick)}`);

    return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url,
        mainEntity: {
            '@type': 'Person',
            name,
            url,
            description,
            ...(avatar ? { image: mediaUrl(avatar) } : {}),
        },
    };
}

export async function RouteJsonLd() {
    const pathname = (await headers()).get('x-pathname') || '';
    const postId = pathname.match(/^\/posts\/([^/]+)$/)?.[1];
    const profileId = pathname.match(/^\/users\/([^/]+)$/)?.[1];
    const data = postId
        ? await postJsonLd(decodeURIComponent(postId))
        : profileId
          ? await profileJsonLd(decodeURIComponent(profileId))
          : null;

    if (!data) {
        return null;
    }

    return <JsonLd data={data} />;
}
