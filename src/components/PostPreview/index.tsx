'use client';

import { Link } from '@/navigation';

import UserBadge from '../UserBadge';
import { postDisplayTitle, postExcerpt } from '../../utils/postText';
import { firstMediaThumbnail } from '../../utils/postMedia';
import { mediaUrl } from '../../utils/image';
import { format_back } from '../../utils/format';

import './PostPreview.scss';

type PostPreviewProps = {
    post: any;
    href?: string;
    media?: 'top' | 'side' | 'none';
    showDate?: boolean;
    asLinkAuthor?: boolean;
    className?: string;
    onMediaLoad?: () => void;
};

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
        post.snippet || postExcerpt(post, 160) || postDisplayTitle(post);
    const thumbnail = firstMediaThumbnail(post);
    const picture = media !== 'none' && thumbnail ? mediaUrl(thumbnail) : null;

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
                    <span className="post_preview_excerpt">{excerpt}</span>
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
