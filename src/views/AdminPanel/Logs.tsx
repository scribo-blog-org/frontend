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
import Pagination from '../../components/Ui/Pagination';

import {
    CategoryEntity,
    EntityView,
    PostEntity,
    SupportEntity,
    UserEntity,
} from './LogEntities';
import LogRow from './LogRow';
import { LOG_TYPES } from './logTypes';

import './Logs.scss';

const PAGE_SIZE = 18;
const ENTITY_FILTERS = ['user', 'post', 'category', 'support_request'];

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

const dayKey = (date: any) => new Date(date).toDateString();

const LogsPage = () => {
    const { showToast } = useContext(AppContext);
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<any>(true);
    const [page, setPage] = useState<any>(1);
    const [pagesCount, setPagesCount] = useState<any>(0);
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
        if (!searchActive) {
            return;
        }

        const timer = setTimeout(
            () => loadEntities(searchText, 1),
            searchText ? SEARCH_DELAY_MS : 0,
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
        setPage(1);
    };

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
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

            const [logsResult, categoriesResult] = await Promise.all([
                getAllLogs(query),
                getCategories(),
            ]);

            if (cancelled) {
                return;
            }

            setCategories(categoriesResult?.data || []);

            if (!logsResult.status) {
                showToast({ type: 'error', message: logsResult.message });
                setLogs([]);
                setPagesCount(0);
                setLoading(false);
                return;
            }

            const items = logsResult.data?.items || [];
            setLogs(items);
            setPagesCount(logsResult.data?.pagination?.pages || 0);

            const postIds = [
                ...new Set(
                    items.map((log: any) => log.data?.post).filter(Boolean),
                ),
            ];

            if (postIds.length) {
                const postsResult = await getPosts({
                    _id: postIds,
                    limit: Math.min(50, postIds.length),
                });

                if (!cancelled) {
                    setPosts(postsResult?.data?.items || []);
                }
            } else if (!cancelled) {
                setPosts([]);
            }

            if (!cancelled) {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [page, filter.id, filter.type, typeFilter, showToast]);

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
        rootRef.current
            ?.querySelector('.pagination_content')
            ?.scrollTo({ top: 0 });
        setExpanded(new Set());
    }, [page, filter.id, typeFilter]);

    if (loading) {
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
                            setPage(1);
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
                        <CancelButton
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
                            hasMore={entitiesPage < entitiesPages}
                            onFocus={() => setSearchActive(true)}
                            onInput={(text: any) => {
                                entitiesRequest.current++;
                                setEntitiesLoading(true);
                                setSearchText(text);
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

            <Pagination
                content={logs}
                page={page - 1}
                pagesCount={pagesCount}
                onPageChange={(index: any) => setPage(index + 1)}
            >
                {(visible: any) =>
                    visible.length ? (
                        visible.map((log: any, index: any) => (
                            <Fragment key={log._id}>
                                {index === 0 ||
                                dayKey(visible[index - 1].date_time) !==
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
                                        visible[index - 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          visible[index - 1]
                                                              ._id,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                    onNext={
                                        visible[index + 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          visible[index + 1]
                                                              ._id,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                />
                            </Fragment>
                        ))
                    ) : (
                        <p className="logs_empty">No events</p>
                    )
                }
            </Pagination>
        </div>
    );
};

export default LogsPage;
