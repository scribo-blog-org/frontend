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
import { getCategories } from '../../api/categories.api';
import { getPosts } from '../../api/posts.api';
import { format_message_date_label } from '../../utils/format';

import FilterIcon from '../../assets/svg/filter.svg';
import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import PlayIcon from '../../assets/svg/play.svg';
import PauseIcon from '../../assets/svg/pause.svg';
import RefreshIcon from '../../assets/svg/refresh.svg';

import SearchSelect from '../../components/Ui/SearchSelect';
import InputField from '../../components/Ui/InputField';
import CancelButton from '../../components/Ui/CancelButton';
import ActionButton from '../../components/Ui/ActionButton';
import DateTimePicker from '../../components/Ui/DateTimePicker';
import Loading from '../../components/Ui/Loading';
import InfiniteScroll from '../../components/Ui/InfiniteScroll';
import { usePagedList } from '../../hooks/usePagedList';

import {
    CategoryEntity,
    ConversationEntity,
    PostEntity,
    RoleChip,
    SupportEntity,
    UserEntity,
} from './LogEntities';
import LogRow from './LogRow';
import { LOG_TYPES } from './logTypes';

import './Logs.scss';

const PAGE_SIZE = 30;
const ENTITY_FILTERS = [
    'user',
    'post',
    'category',
    'conversation',
    'support_request',
    'role',
    'request',
];

const TYPE_OPTIONS = [
    { value: 'all', name: 'All events' },
    ...Object.entries(LOG_TYPES).map(([value, config]: any) => ({
        value,
        name: config.title,
    })),
];

const LEVEL_OPTIONS = [
    { value: 'all', name: 'All levels' },
    { value: 'problems', name: 'Problems only' },
    { value: 'error', name: 'Errors' },
    { value: 'warn', name: 'Warnings' },
    { value: 'info', name: 'Info' },
];

const LIVE_MS = 3000;
const SEARCH_DELAY_MS = 250;
const POSTS_BATCH = 50;

const dayKey = (date: any) => new Date(date).toDateString();

const LogsPage = () => {
    const { showToast } = useContext(AppContext);
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [filter, setFilter] = useState<any>({ type: null, id: null });
    const [typeFilter, setTypeFilter] = useState<any>('all');
    const [levelFilter, setLevelFilter] = useState<any>('all');
    const [dateFrom, setDateFrom] = useState<any>('');
    const [dateTo, setDateTo] = useState<any>('');
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
    const [search, setSearch] = useState<any>('');

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
    // The secondary filters are folded away on a phone; on wide screens they
    // are always shown and these only drive the toggle there.
    const [filtersOpen, setFiltersOpen] = useState<any>(false);
    const [filtersSettled, setFiltersSettled] = useState<any>(false);
    const filtersTimer = useRef<any>(0);
    const [live, setLive] = useState<any>(false);
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

    useEffect(() => () => window.clearTimeout(filtersTimer.current), []);

    const toggleFilters = () => {
        window.clearTimeout(filtersTimer.current);

        if (filtersOpen) {
            setFiltersSettled(false);
            setFiltersOpen(false);
            return;
        }

        setFiltersOpen(true);
        // Open lists inside the folded block must not be clipped, but the
        // block clips while it grows; it is let out once it has finished.
        filtersTimer.current = window.setTimeout(
            () => setFiltersSettled(true),
            300,
        );
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

    // Live and Reload sit beside the search on wide screens and inside the
    // folded block on a phone, so the same buttons are rendered in both.
    const actionButtons = (
        <>
            <ActionButton
                size="lg"
                className={live ? 'logs_live_active' : ''}
                onClick={() => setLive((value: any) => !value)}
            >
                {live ? <PauseIcon /> : <PlayIcon />}
                Live
            </ActionButton>
            <ActionButton
                size="lg"
                onClick={reload}
                // Live refreshes the list on its own, so a manual
                // reload is off for as long as it runs.
                isLoading={reloading || live}
                loaderVariant="segments"
                className="logs_reload"
            >
                <RefreshIcon />
            </ActionButton>
        </>
    );

    return (
        <div className="logs_page" ref={rootRef}>
            <div className="logs_toolbar">
                <div className="logs_toolbar_row logs_toolbar_row_top">
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
                                                log.data?.category ===
                                                filter.id,
                                        )?.data?.category_snapshot
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
                                                    filter.id &&
                                                log.data?.title,
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
                    ) : null}
                    <div className="logs_toolbar_search">
                        <InputField
                            type="text"
                            value={searchText}
                            placeholder="Search by message, user, route, error, IP or request id"
                            onChange={(event: any) =>
                                setSearchText(event.target.value)
                            }
                            length={100}
                        />
                    </div>

                    <ActionButton
                        size="lg"
                        className={`logs_filters_toggle${filtersOpen ? ' logs_filters_toggle_open' : ''}`}
                        onClick={toggleFilters}
                        aria-label="Filters"
                        aria-expanded={filtersOpen}
                    >
                        <ChevronDownIcon />
                        {activeFilters ? (
                            <span className="logs_filters_dot" />
                        ) : null}
                    </ActionButton>
                    <div className="logs_toolbar_actions logs_toolbar_actions_wide">
                        {actionButtons}
                    </div>
                </div>

                <div
                    className={`logs_toolbar_filters${filtersOpen ? ' logs_toolbar_filters_open' : ''}${filtersSettled ? ' logs_toolbar_filters_settled' : ''}`}
                >
                    <div className="logs_toolbar_filters_inner">
                        <div className="logs_toolbar_actions logs_toolbar_actions_folded">
                            {actionButtons}
                        </div>
                        <div className="logs_toolbar_row">
                            <div className="logs_toolbar_level">
                                <SearchSelect
                                    options={LEVEL_OPTIONS}
                                    value={levelFilter}
                                    placeholder="Level"
                                    onChange={(value: any) => {
                                        // Emptying the field clears the filter.
                                        setLevelFilter(value || 'all');
                                    }}
                                />
                            </div>
                            <div className="logs_toolbar_type">
                                <SearchSelect
                                    options={TYPE_OPTIONS}
                                    value={typeFilter}
                                    placeholder="Event type"
                                    onChange={(value: any) => {
                                        setTypeFilter(value || 'all');
                                    }}
                                />
                            </div>

                            <div className="logs_toolbar_range">
                                <DateTimePicker
                                    label="From"
                                    value={dateFrom}
                                    max={dateTo || undefined}
                                    onChange={setDateFrom}
                                />
                                <DateTimePicker
                                    label="To"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={setDateTo}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="logs_list">
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
