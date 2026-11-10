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

import { getAllLogs } from '../../api/logs.api';
import { getUsers } from '../../api/users.api';
import { getPosts } from '../../api/posts.api';
import { format_message_date_label } from '../../utils/format';

import FilterIcon from '../../assets/svg/filter.svg';

import SearchSelect from '../../components/Ui/SearchSelect';
import LogSearch from './LogSearch';
import { FilterField, LogsActions, LogsFilters } from './LogsFilters';
import CancelButton from '../../components/Ui/CancelButton';
import DateTimeField from '../../components/Ui/DateTimeField';
import Loading from '../../components/Ui/Loading';
import InfiniteScroll from '../../components/Ui/InfiniteScroll';
import { usePagedList } from '../../hooks/usePagedList';

import {
    ConversationEntity,
    PostEntity,
    RoleChip,
    SupportEntity,
    UserEntity,
} from './LogEntities';
import LogRow from './LogRow';
import {
    LEVEL_OPTIONS,
    levelFromValues,
    levelValues,
    useLogsToolbar,
} from './logsToolbar';
import { LOG_TYPES } from './logTypes';

import './Logs.scss';

const PAGE_SIZE = 30;
const ENTITY_FILTERS = [
    'user',
    'post',
    'conversation',
    'support_request',
    'role',
    'request',
];

const TYPE_OPTIONS = Object.entries(LOG_TYPES).map(([value, config]: any) => ({
    value,
    name: config.title,
}));

const LIVE_MS = 3000;
const SEARCH_DELAY_MS = 250;
const POSTS_BATCH = 50;

const dayKey = (date: any) => new Date(date).toDateString();

const LogsPage = () => {
    const { showToast } = useContext(AppContext);
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const {
        entity,
        setEntity,
        typeFilter,
        setTypeFilter,
        levelFilter,
        setLevelFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        searchText,
        setSearchText,
        live,
        setLive,
    } = useLogsToolbar();
    const filter = entity;
    const setFilter = setEntity;
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

    const [search, setSearch] = useState<any>(searchText.trim());

    useEffect(() => {
        const timer = setTimeout(
            () => setSearch(searchText.trim()),
            SEARCH_DELAY_MS,
        );

        return () => clearTimeout(timer);
    }, [searchText]);

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

            if (levelFilter !== 'all') {
                query.level = levelFilter;
            }

            if (dateFrom) {
                query.from = new Date(dateFrom).toISOString();
            }

            if (dateTo) {
                query.to = new Date(dateTo).toISOString();
            }

            if (search) {
                query.search = search;
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
        [
            typeFilter,
            levelFilter,
            dateFrom,
            dateTo,
            search,
            filter.type,
            filter.id,
            showToast,
        ],
    );

    const feed = usePagedList({
        fetchPage: fetchLogsPage,
        resetKey: JSON.stringify([
            typeFilter,
            levelFilter,
            dateFrom,
            dateTo,
            search,
            filter.type,
            filter.id,
        ]),
    });
    const logs = feed.items;
    const [reloading, setReloading] = useState<any>(false);
    const refreshFeed = feed.refresh;

    const reload = async () => {
        setReloading(true);
        try {
            await refreshFeed();
        } finally {
            setReloading(false);
        }
    };

    const activeFilters =
        Number(levelFilter !== 'all') +
        Number(typeFilter !== 'all') +
        Number(Boolean(dateFrom)) +
        Number(Boolean(dateTo));

    useEffect(() => {
        if (!live) {
            return;
        }

        const timer = setInterval(() => {
            if (!document.hidden) {
                refreshFeed();
            }
        }, LIVE_MS);

        return () => clearInterval(timer);
    }, [live, refreshFeed]);

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
        rootRef.current?.scrollTo({ top: 0 });
        setExpanded(new Set());
    }, [
        filter.type,
        filter.id,
        typeFilter,
        levelFilter,
        dateFrom,
        dateTo,
        search,
    ]);

    const supportLog = logs.find(
        (log: any) => log.data?.support_request === filter.id,
    );

    const aside = (
        <LogsFilters activeCount={activeFilters}>
            <LogSearch
                value={searchText}
                onChange={setSearchText}
                placeholder="Search by message, user, route, error, IP or request id"
                length={100}
            />
            <LogsActions
                live={live}
                setLive={setLive}
                busy={reloading}
                onReload={reload}
            />
            {filter.type ? (
                <FilterField label="Filtered by">
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
                        {filter.type === 'conversation' && (
                            <ConversationEntity
                                id={filter.id}
                                title={
                                    logs.find(
                                        (log: any) =>
                                            log.data?.conversation ===
                                                filter.id && log.data?.title,
                                    )?.data?.title
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
                        {filter.type === 'request' && (
                            <span className="log_chip">
                                <span className="log_chip_label log_card_mono">
                                    Request {filter.id}
                                </span>
                            </span>
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
                </FilterField>
            ) : null}
            <FilterField label="Level">
                <SearchSelect
                    multiple
                    options={LEVEL_OPTIONS}
                    value={levelValues(levelFilter)}
                    placeholder="All levels"
                    onChange={(values: string[]) =>
                        setLevelFilter(levelFromValues(values))
                    }
                />
            </FilterField>
            <FilterField label="Event type">
                <SearchSelect
                    multiple
                    options={TYPE_OPTIONS}
                    value={levelValues(typeFilter)}
                    placeholder="All events"
                    onChange={(values: string[]) =>
                        setTypeFilter(levelFromValues(values))
                    }
                />
            </FilterField>
            <FilterField label="Period">
                <DateTimeField
                    label="From"
                    value={dateFrom}
                    max={dateTo || undefined}
                    defaultTime="00:00"
                    onChange={setDateFrom}
                />
                <DateTimeField
                    label="To"
                    value={dateTo}
                    min={dateFrom || undefined}
                    defaultTime="23:59"
                    onChange={setDateTo}
                />
            </FilterField>
        </LogsFilters>
    );

    return (
        <>
            {aside}
            <div className="logs_list" ref={rootRef}>
                {feed.loading && !logs.length ? (
                    <Loading size={40} />
                ) : logs.length ? (
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
                                    setFilter={applyFilter}
                                    position={index + 1}
                                    total={logs.length}
                                    hasMore={feed.hasNext}
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
        </>
    );
};

export default LogsPage;
