'use client';

import {
    Fragment,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import { AppContext } from '@/providers/AppProviders';

import { getAllLogs, getLogEntities } from '../../api/logs.api';
import { getUsers } from '../../api/users.api';
import { getCategories } from '../../api/categories.api';
import { getPosts } from '../../api/posts.api';
import { format_message_date_label } from '../../utils/format';

import FilterIcon from '../../assets/svg/filter.svg';

import DropDown from '../../components/Ui/DropDown';
import SearchSelect from '../../components/Ui/SearchSelect';
import CancelButton from '../../components/Ui/CancelButton';
import Loading from '../../components/Ui/Loading';
import InfiniteScroll from '../../components/Ui/InfiniteScroll';
import { usePagedList } from '../../hooks/usePagedList';

import {
    CategoryEntity,
    EntityView,
    PostEntity,
    RoleChip,
    SupportEntity,
    UserEntity,
} from './LogEntities';
import LogRow from './LogRow';
import { LOG_TYPES } from './logTypes';

import './Logs.scss';

const PAGE_SIZE = 30;
const ENTITY_FILTERS = ['user', 'post', 'category', 'support_request', 'role'];

const TYPE_OPTIONS = [
    { value: 'all', name: 'All events' },
    ...Object.entries(LOG_TYPES).map(([value, config]: any) => ({
        value,
        name: config.title,
    })),
];

const ENTITY_LABELS: any = {
    user: 'User',
    post: 'Post',
    category: 'Category',
};
const SEARCH_DELAY_MS = 250;
const SEARCH_PAGE_SIZE = 20;
const POSTS_BATCH = 50;

const dayKey = (date: any) => new Date(date).toDateString();

const LogsPage = () => {
    const { showToast } = useContext(AppContext);
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [filter, setFilter] = useState<any>({ type: null, id: null });
    const [typeFilter, setTypeFilter] = useState<any>('all');
    const rootRef = useRef<any>(null);
    const [expanded, setExpanded] = useState<any>(() => new Set());
    const toggle = (id: any) =>
        setExpanded((prev: any) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });

    const [searchText, setSearchText] = useState<any>('');
    const [searchActive, setSearchActive] = useState<any>(false);
    const [entities, setEntities] = useState<any[]>([]);
    const [entitiesPage, setEntitiesPage] = useState<any>(0);
    const [entitiesPages, setEntitiesPages] = useState<any>(0);
    const [entitiesLoading, setEntitiesLoading] = useState<any>(false);
    const entitiesRequest = useRef<any>(0);

    const loadEntities = useCallback(
        async (text: any, nextPage: any) => {
            const request = ++entitiesRequest.current;
            setEntitiesLoading(true);

            const result = await getLogEntities({
                search: text,
                page: nextPage,
                limit: SEARCH_PAGE_SIZE,
            });

            if (request !== entitiesRequest.current) {
                return;
            }

            setEntitiesLoading(false);

            if (!result.status) {
                showToast({ type: 'error', message: result.message });
                return;
            }

            const items = result.data?.items || [];
            setEntities((prev: any) =>
                nextPage === 1 ? items : [...prev, ...items],
            );
            setEntitiesPage(nextPage);
            setEntitiesPages(result.data?.pagination?.pages || 0);
        },
        [showToast],
    );

    useEffect(() => {
        if (!searchActive || !searchText.trim()) {
            return;
        }

        const timer = setTimeout(
            () => loadEntities(searchText, 1),
            SEARCH_DELAY_MS,
        );

        return () => clearTimeout(timer);
    }, [searchText, searchActive, loadEntities]);

    const applyFilter = (next: any) => {
        const type = next?.type ?? null;
        const id = next?.id ?? null;

        if (filter.type === type && filter.id === id) {
            return;
        }

        setFilter({ type, id });
    };

    const fetchLogsPage = useCallback(
        async (page: number) => {
            const query: any = { page, limit: PAGE_SIZE };

            if (typeFilter !== 'all') {
                query.type = typeFilter;
            }

            if (
                filter.type &&
                filter.id &&
                ENTITY_FILTERS.includes(filter.type)
            ) {
                query[filter.type] = filter.id;
            }

            const result = await getAllLogs(query);

            if (!result.status) {
                showToast({ type: 'error', message: result.message });
                return null;
            }

            return {
                items: result.data?.items || [],
                pages: result.data?.pagination?.pages || 0,
            };
        },
        [typeFilter, filter.type, filter.id, showToast],
    );

    const feed = usePagedList({
        fetchPage: fetchLogsPage,
        resetKey: JSON.stringify([typeFilter, filter.type, filter.id]),
    });
    const logs = feed.items;

    useEffect(() => {
        const fetchCategories = async () => {
            const result = await getCategories();
            setCategories(result?.data || []);
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        const knownIds = new Set(posts.map((post: any) => post._id));
        const missingIds = [
            ...new Set(logs.map((log: any) => log.data?.post).filter(Boolean)),
        ].filter((id: any) => !knownIds.has(id));

        if (!missingIds.length) {
            return;
        }

        let cancelled = false;

        const fetchPosts = async () => {
            const results = await Promise.all(
                Array.from(
                    { length: Math.ceil(missingIds.length / POSTS_BATCH) },
                    (_: any, index: any) =>
                        getPosts({
                            _id: missingIds.slice(
                                index * POSTS_BATCH,
                                (index + 1) * POSTS_BATCH,
                            ),
                            limit: POSTS_BATCH,
                        }),
                ),
            );

            if (cancelled) {
                return;
            }

            const loaded = results.flatMap(
                (result: any) => result?.data?.items || [],
            );

            if (loaded.length) {
                setPosts((prev: any) => [...prev, ...loaded]);
            }
        };

        fetchPosts();

        return () => {
            cancelled = true;
        };
    }, [logs, posts]);

    useEffect(() => {
        const fetchUsers = async () => {
            const userIds = [
                ...new Set(
                    logs
                        .flatMap((log: any) => [
                            log.data?.user,
                            log.data?.updated_user,
                            log.data?.target_user,
                        ])
                        .filter(Boolean),
                ),
            ];

            if (!userIds.length) {
                return;
            }

            const usersResult = await getUsers(
                userIds.map((_id: any) => ({ _id })),
            );

            if (usersResult.status) {
                setUsers(usersResult.data);
            }
        };

        fetchUsers();
    }, [logs]);

    useEffect(() => {
        rootRef.current?.querySelector('.logs_list')?.scrollTo({ top: 0 });
        setExpanded(new Set());
    }, [filter.type, filter.id, typeFilter]);

    if (feed.loading && !logs.length) {
        return <Loading size={40} />;
    }

    const supportLog = logs.find(
        (log: any) => log.data?.support_request === filter.id,
    );

    return (
        <div className="logs_page" ref={rootRef}>
            <div className="logs_toolbar">
                <div className="logs_toolbar_type">
                    <DropDown
                        options={TYPE_OPTIONS}
                        value={typeFilter}
                        placeholder="Event type"
                        onChange={(value: any) => {
                            setTypeFilter(value);
                        }}
                    />
                </div>

                {filter.type ? (
                    <div className="logs_toolbar_filter">
                        <FilterIcon />
                        {filter.type === 'user' && (
                            <UserEntity
                                id={filter.id}
                                data={users.find(
                                    (u: any) => u._id === filter.id,
                                )}
                                setFilter={applyFilter}
                            />
                        )}
                        {filter.type === 'post' && (
                            <PostEntity
                                id={filter.id}
                                data={posts.find(
                                    (p: any) => p._id === filter.id,
                                )}
                                snapshotTitle={
                                    logs.find(
                                        (log: any) =>
                                            log.data?.post === filter.id,
                                    )?.data?.post_title
                                }
                                setFilter={applyFilter}
                            />
                        )}
                        {filter.type === 'category' && (
                            <CategoryEntity
                                id={filter.id}
                                data={categories.find(
                                    (c: any) => c._id === filter.id,
                                )}
                                snapshot={
                                    logs.find(
                                        (log: any) =>
                                            log.data?.category === filter.id,
                                    )?.data?.category_snapshot
                                }
                                setFilter={applyFilter}
                            />
                        )}
                        {filter.type === 'support_request' && (
                            <SupportEntity
                                id={filter.id}
                                accessKey={supportLog?.data?.access_key}
                                kind={supportLog?.data?.kind}
                                setFilter={applyFilter}
                            />
                        )}
                        {filter.type === 'role' && (
                            <RoleChip role={filter.id} />
                        )}
                        <CancelButton
                            size="sm"
                            onClick={() =>
                                applyFilter({ type: null, id: null })
                            }
                        >
                            Reset
                        </CancelButton>
                    </div>
                ) : (
                    <div className="logs_toolbar_search">
                        <SearchSelect
                            options={entities.map((entity: any) => ({
                                value: { type: entity.type, value: entity.id },
                                name: entity.name,
                                render: () => (
                                    <>
                                        <EntityView
                                            kind={entity.type}
                                            name={entity.name}
                                            deleted={entity.deleted}
                                        />
                                        <span className="logs_option_type">
                                            {ENTITY_LABELS[entity.type]}
                                        </span>
                                    </>
                                ),
                            }))}
                            placeholder="Find a user, post, or category"
                            emptyLabel="Nothing in the log"
                            loading={entitiesLoading}
                            minSearchLength={1}
                            hasMore={entitiesPage < entitiesPages}
                            onFocus={() => setSearchActive(true)}
                            onInput={(text: any) => {
                                entitiesRequest.current++;
                                setSearchText(text);

                                if (text.trim()) {
                                    setEntitiesLoading(true);
                                } else {
                                    setEntitiesLoading(false);
                                    setEntities([]);
                                    setEntitiesPage(0);
                                    setEntitiesPages(0);
                                }
                            }}
                            onLoadMore={() =>
                                loadEntities(searchText, entitiesPage + 1)
                            }
                            onChange={(value: any) => {
                                if (!value?.type) {
                                    return;
                                }

                                setSearchActive(false);
                                setSearchText('');
                                setEntities([]);
                                applyFilter({
                                    type: value.type,
                                    id: value.value,
                                });
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="logs_list">
                {logs.length ? (
                    <InfiniteScroll
                        hasNext={feed.hasNext}
                        loadingNext={feed.loadingNext}
                        onLoadNext={feed.loadNext}
                    >
                        {logs.map((log: any, index: any) => (
                            <Fragment key={log._id}>
                                {index === 0 ||
                                dayKey(logs[index - 1].date_time) !==
                                    dayKey(log.date_time) ? (
                                    <div className="logs_day">
                                        {format_message_date_label(
                                            log.date_time,
                                        )}
                                    </div>
                                ) : null}
                                <LogRow
                                    log={log}
                                    users={users}
                                    posts={posts}
                                    categories={categories}
                                    setFilter={applyFilter}
                                    expanded={expanded.has(log._id)}
                                    onToggle={() => toggle(log._id)}
                                    onPrev={
                                        logs[index - 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          logs[index - 1]._id,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                    onNext={
                                        logs[index + 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          logs[index + 1]._id,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                />
                            </Fragment>
                        ))}
                    </InfiniteScroll>
                ) : (
                    <p className="logs_empty">No events</p>
                )}
            </div>
        </div>
    );
};

export default LogsPage;
