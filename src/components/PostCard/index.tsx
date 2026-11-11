'use client';

import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navigation';

import './PostCard.scss';

import PostHeader from '../PostHeader';
import PostActions from '../PostActions';
import PostMedia from '../PostMedia';
import HashtagHtml from '../HashtagHtml';

import { normalizePostMedia } from '../../utils/postMedia';

const PostCard = ({ post, setPosts }: any) => {
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

    const navigate = useNavigate();
    const media = normalizePostMedia(post);

    return (
        <article
            className={`posts_item app-transition${isLeaving ? ' posts_item_leaving' : ''}`}
        >
            <PostHeader post={post} onDeletePost={deletePost} />
            {post.content_text || post.excerpt ? (
                <PostText post={post} />
            ) : null}
            {media.length ? (
                <div
                    className="posts_item_media"
                    onClick={(event: any) => {
                        if (
                            event.defaultPrevented ||
                            event.target.closest(
                                '.post_media_slide, .post_media_arrow, a, button, video',
                            )
                        ) {
                            return;
                        }
                        navigate('/posts/' + post._id);
                    }}
                >
                    <PostMedia media={media} variant="feed" />
                </div>
            ) : null}
            <PostActions article={post} setArticle={updatePost} />
        </article>
    );
};

const PostText = ({ post }: any) => {
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);
    const [clamped, setClamped] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const expandedRef = useRef(false);
    const busyRef = useRef(false);
    const href = `/posts/${post._id}`;

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        // The clamp can only be measured while the text is collapsed and not
        // in the middle of an expand/collapse animation.
        const measure = () => {
            if (expandedRef.current || busyRef.current) {
                return;
            }

            setClamped(element.scrollHeight > element.clientHeight + 2);
        };
        measure();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [post.content_text]);

    const toggle = () => {
        const element = ref.current;

        if (!element || busyRef.current) {
            return;
        }

        const next = !expandedRef.current;
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        expandedRef.current = next;
        setExpanded(next);

        if (reduce) {
            element.style.maxHeight = next ? 'none' : '';
            return;
        }

        busyRef.current = true;

        const done = (event: TransitionEvent) => {
            if (event.propertyName !== 'max-height') {
                return;
            }

            element.removeEventListener('transitionend', done);
            busyRef.current = false;

            if (next) {
                element.style.maxHeight = 'none';
            }
        };

        element.addEventListener('transitionend', done);
        // no transition fires when the height doesn't change: don't stay busy
        window.setTimeout(() => {
            if (busyRef.current) {
                done({ propertyName: 'max-height' } as TransitionEvent);
            }
        }, 450);

        // max-height can't animate to or from `none`: go through a fixed px
        element.style.maxHeight = `${element.scrollHeight}px`;
        element.getBoundingClientRect();
        element.style.maxHeight = next ? `${element.scrollHeight}px` : '';
    };

    return (
        <div className="posts_item_text_wrap">
            <div
                ref={ref}
                className={`posts_item_text${clamped && !expanded ? ' posts_item_text_clamped' : ''}`}
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
            {clamped || expanded ? (
                <button
                    type="button"
                    className="posts_item_more"
                    aria-expanded={expanded}
                    onClick={toggle}
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            ) : null}
        </div>
    );
};
export default memo(PostCard);
