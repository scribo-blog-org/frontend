'use client';

import { Link } from '@/navigation';

import UserBadge from '../UserBadge';
import Category from '../Category';
import { plainTextExcerpt } from '../../seo/excerpt';
import { mediaUrl } from '../../utils/image';
import { format_back } from '../../utils/format';

import './PostPreview.scss';

type PostPreviewProps = {
    post: any;
    // Where the card leads. Without it the card is a plain, non-clickable view
    // (a confirmation dialog, a log).
    href?: string;
    // 'top' puts the picture above the text (chat), 'side' keeps it small on
    // the right (lists and search), 'none' hides it.
    media?: 'top' | 'side' | 'none';
    showDate?: boolean;
    asLinkAuthor?: boolean;
    className?: string;
    onMediaLoad?: () => void;
};

// One way to show a post as an object: author, category, title, a short
// excerpt and the picture. Chat messages, search results and the delete
// confirmation all render this card.
const PostPreview = ({
    post,
    href,
    media = 'top',
    showDate = false,
    asLinkAuthor = true,
    className = '',
    onMediaLoad,
}: PostPreviewProps) => {
    const excerpt =
        post.excerpt ||
        post.snippet ||
        plainTextExcerpt(post.content_text || '', 160);
    const picture =
        media !== 'none' && post.featured_image
            ? mediaUrl(post.featured_image)
            : null;

    const body = (
        <>
            {picture && media === 'top' ? (
                <span className="post_preview_media">
                    <img
                        src={picture}
                        alt=""
                        loading="lazy"
                        onLoad={onMediaLoad}
                    />
                </span>
            ) : null}
            <span className="post_preview_body">
                <span className="post_preview_copy">
                    <span className="post_preview_title">{post.title}</span>
                    {excerpt ? (
                        <span className="post_preview_excerpt">{excerpt}</span>
                    ) : null}
                </span>
                {picture && media === 'side' ? (
                    <span className="post_preview_thumb">
                        <img
                            src={picture}
                            alt=""
                            loading="lazy"
                            onLoad={onMediaLoad}
                        />
                    </span>
                ) : null}
            </span>
        </>
    );

    return (
        <article
            className={`post_preview${href ? ' post_preview_link' : ''} app-transition ${className}`.trim()}
        >
            <div className="post_preview_header">
                {post.author ? (
                    <UserBadge
                        data={post.author}
                        asLink={asLinkAuthor && Boolean(href)}
                        className="post_preview_author"
                    />
                ) : null}
                {showDate && post.created_date ? (
                    <span className="post_preview_date">
                        {format_back(post.created_date)}
                    </span>
                ) : null}
                {post.category ? (
                    <Category
                        tag
                        category={post.category}
                        className="post_preview_category"
                    />
                ) : null}
            </div>

            {href ? (
                <Link
                    href={href}
                    className="post_preview_main"
                    onClick={(event: any) => event.stopPropagation()}
                >
                    {body}
                </Link>
            ) : (
                <div className="post_preview_main">{body}</div>
            )}
        </article>
    );
};

export default PostPreview;
