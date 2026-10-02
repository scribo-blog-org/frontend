'use client';

import { memo, useCallback } from 'react';
import { Link } from '@/navigation';

import './PostCard.scss';

import PostHeader from '../PostHeader';
import PostActions from '../PostActions';
import PostHashtags from '../PostHashtags';

import Sceleton from '../Ui/Sceleton/Sceleton';

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

    const deletePost = useCallback(
        (id: any) => {
            setPosts((prev: any) =>
                prev.filter((item: any) => item._id !== id),
            );
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
                    <img src={post.featured_image} alt="" />
                </div>
            ) : null}
        </>
    );

    return (
        <article className="posts_item app-transition">
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
