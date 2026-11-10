import { plainTextExcerpt } from '../seo/excerpt';

export const POST_EXCERPT_LENGTH = 80;

export function postExcerpt(
    post: any,
    maxLength: number = POST_EXCERPT_LENGTH,
) {
    const given = typeof post?.excerpt === 'string' ? post.excerpt.trim() : '';
    if (given) {
        return given.length > maxLength
            ? plainTextExcerpt(given, maxLength)
            : given;
    }

    return plainTextExcerpt(post?.content_text || '', maxLength).trim();
}

export function postDisplayTitle(
    post: any,
    maxLength: number = POST_EXCERPT_LENGTH,
) {
    const excerpt = postExcerpt(post, maxLength);
    if (excerpt) {
        return excerpt;
    }

    const nick = post?.author?.nick_name;
    return nick ? `Post by ${nick}` : 'Post';
}
