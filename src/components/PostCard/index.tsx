'use client';

import { memo, useCallback, useState } from 'react';
import { Link } from '@/navigation';

import './PostCard.scss';

import PostHeader from '../PostHeader';
import PostActions from '../PostActions';
import PostHashtags from '../PostHashtags';

import Sceleton from '../Ui/Sceleton/Sceleton';
import { mediaUrl } from '../../utils/image';

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

    // The card fades out first so the feed does not jump when a post is
    // removed; users who prefer reduced motion get an immediate removal.
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

    const body = (
        <>
            <Sceleton
                isLoading={isLoading}
                rounded={true}
                section={false}
                className="posts_item_title"
            >
                <h2 className="posts_item_title">{post.title}</h2>
            </Sceleton>
            {post.featured_image ? (
                <div className="posts_item_img">
                    <img src={mediaUrl(post.featured_image)} alt="" />
                </div>
            ) : null}
        </>
    );

    return (
        <article
            className={`posts_item app-transition${isLeaving ? ' posts_item_leaving' : ''}`}
        >
            <PostHeader
                post={post}
                isLoading={isLoading}
                onDeletePost={deletePost}
                showCategory
            />
            {isLoading || !post._id ? (
                <div className="posts_item_main">{body}</div>
            ) : (
                <Link className="posts_item_main" href={`/posts/${post._id}`}>
                    {body}
                </Link>
            )}
            <PostActions
                article={post}
                isLoading={isLoading}
                setArticle={updatePost}
                showCategory={false}
            />
            {isLoading ? null : <PostHashtags post={post} />}
        </article>
    );
};

export default memo(PostCard);
