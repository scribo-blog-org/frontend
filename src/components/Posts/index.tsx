'use client';

import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { AppContext } from '@/providers/AppProviders';
import {
    getPosts,
    unwrapPostsResponse,
    POSTS_PAGE_LIMIT,
} from '../../api/posts.api';

import './Posts.scss';

import PostsFilters from '../../components/PostsFilters';
import NoPosts from '../NoPosts';
import PostCard from '../PostCard';
import InfiniteScroll from '../Ui/InfiniteScroll';
import { usePagedList } from '../../hooks/usePagedList';
import { scrollTo } from '../../utils/navigation';

const PAGE_LIMIT = POSTS_PAGE_LIMIT;
const EMPTY_QUERY: any = {};

const followIds = (profile: any) =>
    (profile?.follows || []).map((item: any) =>
        String(item._id || item).toLowerCase(),
    );

const Posts = ({
    query = EMPTY_QUERY,
    postsFilters = [],
    wait = false,
    feed: controlledFeed,
    showFilters = true,
    isLoading: controlledLoading = false,
    initialPosts = [],
    initialPagesCount = 0,
    empty = null,
}: any) => {
    const isControlled = Boolean(controlledFeed);
    const { profile } = useContext(AppContext);

    const [tab, setTab] = useState<'all' | 'following'>(
        postsFilters.includes('following') ? 'following' : 'all',
    );

    const queryKey = JSON.stringify(query);

    const filtersKey = postsFilters.join(',');

    useEffect(() => {
        setTab(filtersKey.includes('following') ? 'following' : 'all');
    }, [filtersKey]);

    const filters = useMemo(
        () => [
            { _id: 'all', name: 'All', isActive: tab === 'all' },
            ...(profile?._id
                ? [
                      {
                          _id: 'subscription',
                          name: 'Following',
                          isActive: tab === 'following',
                      },
                  ]
                : []),
        ],
        [tab, profile?._id],
    );

    const baseQuery = useMemo(() => {
        const extraQuery = JSON.parse(queryKey);
        const subscriptionFilterActive = tab === 'following' && profile?._id;
        const next = {
            expand: 'author',
            limit: PAGE_LIMIT,
            ...extraQuery,
        };

        if (subscriptionFilterActive) {
            const follows = followIds({ follows: profile?.follows });

            if (extraQuery.author) {
                const authors = (
                    Array.isArray(extraQuery.author)
                        ? extraQuery.author
                        : [extraQuery.author]
                ).map((id: any) => String(id).toLowerCase());
                const intersect = authors.filter((id: any) =>
                    follows.includes(id),
                );

                if (!intersect.length) {
                    return { empty: true };
                }

                next.author = intersect;
            } else if (!follows.length) {
                return { empty: true };
            } else {
                next.author = follows;
            }
        }

        return next;
    }, [tab, profile, queryKey]);

    const resetKey = JSON.stringify(baseQuery);

    const fetchPage = useCallback(
        async (page: number) => {
            if (baseQuery.empty) {
                return { items: [], pages: 0, total: 0 };
            }

            const response = await getPosts({ ...baseQuery, page });
            const { items, pagination } = unwrapPostsResponse(response);

            if (response?.status === true || items.length) {
                return {
                    items,
                    pages: pagination.pages || 0,
                    total: pagination.total,
                };
            }

            return null;
        },
        [baseQuery],
    );

    const ownFeed = usePagedList({
        fetchPage,
        resetKey,
        enabled: !isControlled && !wait,
        initial: { items: initialPosts, pages: initialPagesCount },
    });

    const feed = controlledFeed ?? ownFeed;
    const loading = isControlled ? Boolean(controlledLoading) : feed.loading;

    const lastResetKey = useRef<string | null>(null);

    useEffect(() => {
        if (isControlled) {
            return;
        }

        if (
            lastResetKey.current !== null &&
            lastResetKey.current !== resetKey
        ) {
            const column = document.getElementById('posts_column');

            if (column && column.getBoundingClientRect().top < 0) {
                scrollTo('posts_column', 'start');
            }
        }

        lastResetKey.current = resetKey;
    }, [isControlled, resetKey]);

    const handleFilters = (id: string) => {
        const next = id === 'subscription' ? 'following' : 'all';

        if (next === tab) {
            scrollTo('posts_column', 'start');
            feed.refresh?.();
            return;
        }

        setTab(next);
    };

    return (
        <div className="posts posts_columns" id="posts_column">
            {showFilters && !isControlled && (
                <PostsFilters filters={filters} onSelect={handleFilters} />
            )}

            {loading && feed.items.length === 0 ? (
                [0, 1, 2, 3, 4].map((index: any) => (
                    <PostCard
                        key={index}
                        post={{ title: 'Loading...' }}
                        isLoading={true}
                    />
                ))
            ) : feed.items.length === 0 ? (
                (empty ?? <NoPosts />)
            ) : (
                <InfiniteScroll
                    hasNext={feed.hasNext}
                    loadingNext={feed.loadingNext}
                    onLoadNext={feed.loadNext}
                    loader={
                        <PostCard
                            isLoading={true}
                            post={{ title: 'Loading...' }}
                        />
                    }
                >
                    {feed.items.map((post: any) => (
                        <PostCard
                            isLoading={false}
                            key={post._id}
                            post={post}
                            setPosts={feed.setItems}
                        />
                    ))}
                </InfiniteScroll>
            )}
        </div>
    );
};

export default Posts;
