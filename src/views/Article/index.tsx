'use client';

import { useState, useEffect } from 'react';
import {
    useParams,
    useNavigate,
    useSearchParams,
    useLocation,
} from '@/navigation';
import PostComment from '../../components/PostComments/index';
import Loading from '../../components/Ui/Loading';
import PostActions from '../../components/PostActions';
import './Article.scss';
import HashtagHtml from '../../components/HashtagHtml';
import PostHeader from '../../components/PostHeader';

import { getPostById } from '../../api/posts.api';
import PageSeo from '../../components/Seo/index';
import { plainTextExcerpt } from '../../seo/excerpt';
import { mediaUrl } from '../../utils/image';

const Article = ({
    initialArticle = null,
}: {
    initialArticle?: Record<string, any> | null;
}) => {
    const { id } = useParams();
    let [searchParams] = useSearchParams();
    const [comment, setComment] = useState<any>(
        searchParams.get('comment') || null,
    );
    const location = useLocation();
    const navigate = useNavigate();

    const [article, setArticle] = useState<Record<string, any> | null>(
        initialArticle,
    );
    const [isLoading, setIsLoading] = useState<any>(!initialArticle?._id);

    useEffect(() => {
        let cancelled = false;

        const getArticle = async () => {
            if (!initialArticle?._id) {
                setIsLoading(true);
            }

            try {
                const result = await getPostById(id, {
                    expand: 'author,category',
                    view: 1,
                });

                if (cancelled) {
                    return;
                }

                if (result.status) {
                    setArticle(result.data);
                    return;
                }

                if (!initialArticle?._id) {
                    navigate('/404');
                }
            } catch {
                if (!cancelled && !initialArticle?._id) {
                    navigate('/404');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        getArticle();

        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    useEffect(() => {
        if (location.state?.comment) {
            setComment(location.state.comment);
            return;
        }

        const commentId = searchParams.get('comment');

        if (commentId) {
            setComment(commentId);
        }
    }, [location.state?.comment, searchParams]);

    return !isLoading && article?._id ? (
        <div>
            <PageSeo
                title={article.title}
                description={
                    plainTextExcerpt(article.content_text) || article.title
                }
                path={`/posts/${article._id}`}
                image={article.featured_image || undefined}
                type="article"
            />
            {article._id ? (
                <div className="article">
                    <h1 className="article_title">{article.title}</h1>
                    <div className="article_topic">
                        <PostHeader
                            post={article}
                            onDeletePost={() => navigate('/')}
                        />
                        <PostActions
                            article={article}
                            setArticle={setArticle}
                            onDeletePost={() => navigate('/')}
                        />
                    </div>
                    {article.featured_image ? (
                        <div className="article_featured_image">
                            <img
                                src={mediaUrl(article.featured_image)}
                                alt={'featured'}
                            />
                        </div>
                    ) : (
                        <></>
                    )}
                    <HashtagHtml
                        className="article_content"
                        html={article.content_text}
                    />
                    <PostComment
                        postId={article._id}
                        navigateTo={comment}
                        onCommentsChange={(
                            comments: any,
                            commentsCount: any,
                        ) => {
                            setArticle((current: any) =>
                                current
                                    ? {
                                          ...current,
                                          comments,
                                          comments_count: commentsCount,
                                      }
                                    : current,
                            );
                        }}
                    />
                </div>
            ) : (
                <></>
            )}
        </div>
    ) : (
        <Loading size={48} />
    );
};

export default Article;
