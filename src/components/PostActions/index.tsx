'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';

import { likePost, savePost } from '../../api/posts.api';
import { hasId, setIdPresent, withId, withoutId } from '../../utils/ids';

import './PostActions.scss';

import BookMarkBorder from '../../assets/svg/bookmark-outline.svg';
import BookMarkFilled from '../../assets/svg/bookmark-filled.svg';
import ShareIcon from '../../assets/svg/share.svg';
import CommentIcon from '../../assets/svg/comment.svg';
import EyeIcon from '../../assets/svg/eye.svg';
import LikeIcon from '../../assets/svg/like-outline.svg';
import FilledLikeIcon from '../../assets/svg/like-filled.svg';

import Category from '../Category/index';
import Tooltip from '../Ui/Tooltip/index';
import SharePostModal from '../SharePostModal';

import Sceleton from '../Ui/Sceleton/Sceleton';

const PostActions = ({
    className,
    article,
    setArticle,
    isLoading = false,
    showCategory = true,
}: any) => {
    const {
        profile,
        setProfile,
        showToast,
        showModalWindow,
        requestCloseModal,
    } = useContext(AppContext);
    const [isSaved, setIsSaved] = useState<any>(
        hasId(profile?.saved_posts, article?._id),
    );

    const likeBusy = useRef(false);
    const likeWanted = useRef<any>(null);

    const savedBusy = useRef(false);
    const savedWanted = useRef<any>(null);

    useEffect(() => {
        if (savedWanted.current === null) {
            setIsSaved(hasId(profile?.saved_posts, article?._id));
        }
    }, [profile, article?._id]);

    const patchArticle = (updater: any) => {
        setArticle((prev: any) => {
            const current =
                prev && !Array.isArray(prev) && prev._id ? prev : article;
            if (!current?._id) {
                return prev;
            }
            return updater(current);
        });
    };

    const getCommentsCount = (comments: any) => {
        if (!Array.isArray(comments)) return 0;

        return comments.reduce((count: any, comment: any) => {
            if (!comment || typeof comment !== 'object') {
                return count;
            }
            return count + 1 + getCommentsCount(comment.replies);
        }, 0);
    };

    const commentsCount =
        typeof article.comments_count === 'number'
            ? article.comments_count
            : getCommentsCount(article.comments);
    const viewsCount = Number(article.views_count || article.views || 0);
    const firstCommentId = Array.isArray(article.comments)
        ? article.comments.find((comment: any) => comment?._id)?._id
        : '';

    const flushLike = async () => {
        if (likeBusy.current || !article?._id || !profile?._id) {
            return;
        }

        likeBusy.current = true;

        try {
            while (likeWanted.current !== null) {
                const wantLiked = likeWanted.current;
                likeWanted.current = null;

                const result = await likePost(
                    article._id,
                    wantLiked ? 'POST' : 'DELETE',
                );

                if (likeWanted.current !== null) {
                    continue;
                }

                if (result.status === true && result.data?.likes) {
                    patchArticle((current: any) => ({
                        ...current,
                        likes: result.data.likes,
                    }));
                } else if (result.statusCode === 409) {
                    patchArticle((current: any) => ({
                        ...current,
                        likes: setIdPresent(
                            current.likes,
                            profile._id,
                            wantLiked,
                        ),
                    }));
                } else {
                    patchArticle((current: any) => ({
                        ...current,
                        likes: setIdPresent(
                            current.likes,
                            profile._id,
                            !wantLiked,
                        ),
                    }));
                    showToast({
                        message: 'Could not like this. Please try again',
                        type: 'error',
                    });
                }
            }
        } finally {
            likeBusy.current = false;
            if (likeWanted.current !== null) {
                flushLike();
            }
        }
    };

    const doLike = () => {
        if (!profile) {
            showToast({
                message: 'Log in to like this!',
                type: 'warning',
            });
            return;
        }

        if (!article?._id) {
            return;
        }

        const currentlyWantedLiked =
            likeWanted.current !== null
                ? likeWanted.current
                : hasId(article.likes, profile._id);

        const nextLiked = !currentlyWantedLiked;

        likeWanted.current = nextLiked;

        patchArticle((current: any) => ({
            ...current,
            likes: setIdPresent(current.likes, profile._id, nextLiked),
        }));

        flushLike();
    };

    const flushSave = async () => {
        if (savedBusy.current || !article?._id || !profile?._id) {
            return;
        }

        savedBusy.current = true;

        try {
            while (savedWanted.current !== null) {
                const wantSaved = savedWanted.current;
                savedWanted.current = null;

                const result = await savePost(
                    article._id,
                    wantSaved ? 'POST' : 'DELETE',
                );

                if (savedWanted.current !== null) {
                    continue;
                }

                if (result.status === true) {
                    setProfile((prev: any) => ({
                        ...prev,
                        saved_posts: wantSaved
                            ? withId(prev.saved_posts, article._id)
                            : withoutId(prev.saved_posts, article._id),
                    }));
                    showToast({
                        message: wantSaved ? 'Saved!' : 'Removed from saved!',
                        type: 'success',
                    });
                } else if (result.statusCode === 409) {
                    setProfile((prev: any) => ({
                        ...prev,
                        saved_posts: wantSaved
                            ? withId(prev.saved_posts, article._id)
                            : withoutId(prev.saved_posts, article._id),
                    }));
                } else {
                    setIsSaved(!wantSaved);
                    if (result.statusCode === 401) {
                        showToast({
                            message: 'Log in to save this post!',
                            type: 'warning',
                        });
                    } else {
                        showToast({
                            message:
                                'Could not save the post. Please try again',
                            type: 'error',
                        });
                    }
                }
            }
        } finally {
            savedBusy.current = false;
            if (savedWanted.current !== null) {
                flushSave();
            }
        }
    };

    const openShareModal = () => {
        if (!article?._id) {
            return;
        }

        showModalWindow({
            title: 'Share',
            size: 'small',
            content: (
                <SharePostModal
                    postId={article._id}
                    postTitle={article.title}
                    showToast={showToast}
                    requestCloseModal={requestCloseModal}
                />
            ),
        });
    };

    const doSave = () => {
        if (!profile) {
            showToast({
                message: 'Log in to save this post!',
                type: 'warning',
            });
            return;
        }

        if (!article?._id) {
            return;
        }

        const currentlyWantedSaved =
            savedWanted.current !== null ? savedWanted.current : isSaved;

        const nextSaved = !currentlyWantedSaved;

        savedWanted.current = nextSaved;
        setIsSaved(nextSaved);

        flushSave();
    };

    return (
        <div className={`post_actions ${className ?? ''}`}>
            <Sceleton
                isLoading={isLoading}
                rounded={true}
                className="post_actions_left_side"
            >
                <div className="post_actions_left_side">
                    <Tooltip
                        text={
                            hasId(article.likes, profile?._id)
                                ? 'Unlike'
                                : 'Like'
                        }
                        clickable={true}
                    >
                        <button
                            type="button"
                            className="post_actions_button app-transition"
                            onClick={doLike}
                        >
                            {hasId(article.likes, profile?._id) ? (
                                <FilledLikeIcon />
                            ) : (
                                <LikeIcon />
                            )}
                            <p>
                                {article.likes?.length > 0
                                    ? article.likes.length
                                    : ''}
                            </p>
                        </button>
                    </Tooltip>
                    <Tooltip
                        text={'Go to comments'}
                        className="post_actions_comment"
                        clickable={true}
                    >
                        <Link
                            className="post_actions_button post_actions_comment app-transition"
                            href={`/posts/${article._id}${firstCommentId ? `?comment=${firstCommentId}` : ''}`}
                        >
                            <CommentIcon />
                            {commentsCount > 0 ? <p>{commentsCount}</p> : <></>}
                        </Link>
                    </Tooltip>
                    <Tooltip
                        text={isSaved ? 'Remove from saved' : 'Save'}
                        clickable={true}
                    >
                        <button
                            type="button"
                            className="post_actions_button app-transition"
                            onClick={doSave}
                        >
                            {isSaved ? <BookMarkFilled /> : <BookMarkBorder />}
                        </button>
                    </Tooltip>
                    <Tooltip text="Views">
                        <span className="post_actions_button post_actions_views">
                            <EyeIcon />
                            <p>{viewsCount}</p>
                        </span>
                    </Tooltip>
                    <Tooltip text="Share" clickable={true}>
                        <button
                            type="button"
                            className="post_actions_button app-transition"
                            onClick={openShareModal}
                        >
                            <ShareIcon />
                        </button>
                    </Tooltip>
                </div>
            </Sceleton>
            {showCategory ? (
                <Sceleton
                    isLoading={isLoading}
                    rounded={true}
                    className="post_actions_right_side"
                >
                    <div className="post_actions_right_side">
                        <Category tag category={article.category} />
                    </div>
                </Sceleton>
            ) : null}
        </div>
    );
};

export default PostActions;
