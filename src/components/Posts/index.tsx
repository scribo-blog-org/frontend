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
import { getCategories } from '../../api/categories.api';

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
}: any) => {
    const isControlled = Boolean(controlledFeed);
    const { profile } = useContext(AppContext);

    const [filters, setFilters] = useState<any[]>([]);
    const [categoryList, setCategoryList] = useState<any[]>([]);

    const queryKey = JSON.stringify(query);

    useEffect(() => {
        if (isControlled) {
            return;
        }

        if (categoryList.length) {
            return;
        }

        const loadCategories = async () => {
            const result = await getCategories();
            setCategoryList(Array.isArray(result?.data) ? result.data : []);
        };

        loadCategories();
    }, [isControlled, categoryList.length]);

    useEffect(() => {
        if (isControlled) {
            return;
        }

        const isPostsFiltersEmpty = postsFilters.length === 0;

        let uniqueFilters = categoryList.map((category: any) => ({
            ...category,
            isActive: isPostsFiltersEmpty
                ? true
                : postsFilters.includes('all') ||
                  postsFilters.includes(String(category._id).toLowerCase()) ||
                  postsFilters.includes(category._id),
        }));

        if (profile?._id) {
            uniqueFilters.unshift({
                _id: 'subscription',
                name: 'Following',
                isActive: postsFilters.includes('following'),
                color: null,
                iconObject: null,
            });
        }

        uniqueFilters.unshift({
            _id: 'all',
            name: 'All',
            isActive: isPostsFiltersEmpty || postsFilters.includes('all'),
            color: null,
            iconObject: null,
        });

        setFilters(uniqueFilters);
    }, [isControlled, categoryList, postsFilters, profile?._id]);

    const baseQuery = useMemo(() => {
        const extraQuery = JSON.parse(queryKey);
        const allActive = filters.find((f: any) => f._id === 'all')?.isActive;
        const subscriptionFilterActive = filters.find(
            (f: any) => f._id === 'subscription',
        )?.isActive;
        const categoryIds = filters
            .filter(
                (f: any) =>
                    !['all', 'subscription'].includes(f._id) && f.isActive,
            )
            .map((f: any) => f._id);

        const next = {
            expand: 'author,category',
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

        if (filters.length && !allActive) {
            if (!categoryIds.length) {
                return { empty: true };
            }

            next.category = categoryIds;
        }

        return next;
    }, [filters, profile, queryKey]);

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
        enabled: !isControlled && !wait && filters.length > 0,
        initial: { items: initialPosts, pages: initialPagesCount },
    });

    const feed = controlledFeed ?? ownFeed;
    const loading = isControlled ? Boolean(controlledLoading) : feed.loading;

    const lastResetKey = useRef<string | null>(null);

    useEffect(() => {
        if (isControlled || !filters.length) {
            return;
        }

        if (
            lastResetKey.current !== null &&
            lastResetKey.current !== resetKey
        ) {
            scrollTo('posts_column', 'start');
        }

        lastResetKey.current = resetKey;
    }, [isControlled, filters.length, resetKey]);

    const handleFilters = (next: any) => {
        setFilters(next);
    };

    return (
        <div className="posts posts_columns" id="posts_column">
            {showFilters && !isControlled && (
                <PostsFilters
                    isLoading={loading && filters.length === 0}
                    filters={filters}
                    setFilters={handleFilters}
                />
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
                <NoPosts />
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
