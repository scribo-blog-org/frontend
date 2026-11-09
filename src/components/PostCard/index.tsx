'use client';

import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@/navigation';

import './PostCard.scss';

import PostHeader from '../PostHeader';
import PostActions from '../PostActions';
import PostMedia from '../PostMedia';
import HashtagHtml from '../HashtagHtml';

import Sceleton from '../Ui/Sceleton/Sceleton';
import { normalizePostMedia } from '../../utils/postMedia';

const PostCard = ({ isLoading = false, post, setPosts }: any) => {
    const updatePost = useCallback(
        (next: any) => {
            setPosts((prev: any) =>
                prev.map((item: any) => {
                    if (item._id !== post._id) {
                        return item;
                    }
                    return typeof next === 'function'
                        ? next(item)
                        : { ...item, ...next };
                }),
            );
        },
        [setPosts, post._id],
    );

    const [isLeaving, setIsLeaving] = useState(false);

    const deletePost = useCallback(
        (id: any) => {
            const remove = () =>
                setPosts((prev: any) =>
                    prev.filter((item: any) => item._id !== id),
                );

            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                remove();
                return;
            }

            setIsLeaving(true);
            window.setTimeout(remove, 240);
        },
        [setPosts],
    );

    const media = normalizePostMedia(post);
    const ready = !isLoading && Boolean(post._id);

    return (
        <article
            className={`posts_item app-transition${isLeaving ? ' posts_item_leaving' : ''}`}
        >
            <PostHeader
                post={post}
                isLoading={isLoading}
                onDeletePost={deletePost}
            />
            {ready ? (
                post.content_text || post.excerpt ? (
                    <PostText post={post} />
                ) : null
            ) : (
                <Sceleton isLoading={true} rounded={true} section={false}>
                    <div className="posts_item_text_skeleton" />
                </Sceleton>
            )}
            {ready && media.length ? (
                <PostMedia media={media} variant="feed" />
            ) : null}
            <PostActions
                article={post}
                isLoading={isLoading}
                setArticle={updatePost}
            />
        </article>
    );
};

const PostText = ({ post }: any) => {
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);
    const [clamped, setClamped] = useState(false);
    const href = `/posts/${post._id}`;

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const measure = () =>
            setClamped(element.scrollHeight > element.clientHeight + 2);
        measure();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [post.content_text]);

    return (
        <div className="posts_item_text_wrap">
            <div
                ref={ref}
                className={`posts_item_text${clamped ? ' posts_item_text_clamped' : ''}`}
                onClick={(event: any) => {
                    if (
                        event.defaultPrevented ||
                        event.target.closest('a, button')
                    ) {
                        return;
                    }
                    navigate(href);
                }}
            >
                {post.content_text ? (
                    <HashtagHtml
                        className="posts_item_text_body"
                        html={post.content_text}
                    />
                ) : (
                    <p className="posts_item_text_body">{post.excerpt}</p>
                )}
            </div>
            {clamped ? (
                <Link className="posts_item_more" href={href}>
                    Show more
                </Link>
            ) : null}
        </div>
    );
};
export default memo(PostCard);
