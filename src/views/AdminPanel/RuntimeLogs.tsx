'use client';

import {
    Fragment,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { AppContext } from '@/providers/AppProviders';

import { getRuntimeLogs } from '../../api/logs.api';
import { format_message_date_label } from '../../utils/format';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';

import SearchSelect from '../../components/Ui/SearchSelect';
import DateTimeField from '../../components/Ui/DateTimeField';
import Loading from '../../components/Ui/Loading';
import InfiniteScroll from '../../components/Ui/InfiniteScroll';
import { useOverlayPresence } from '../../components/Ui/useOverlayEnter';

import LogSearch from './LogSearch';
import {
    FilterField,
    LogsActions,
    LogsFilters,
    ServiceChecks,
} from './LogsFilters';
import RuntimeLogDetails, { queryString } from './RuntimeLogDetails';
import {
    LEVEL_OPTIONS,
    RUNTIME_SERVICES,
    levelFromValues,
    levelValues,
    digitsOnly,
    useLogsToolbar,
} from './logsToolbar';
import { formatDuration } from './logFormat';
import { LEVELS } from './logTypes';
import { LOG_CHUNK, LOG_WINDOW } from './logWindow';

import './Logs.scss';
import './RuntimeLogs.scss';

const LIVE_MS = 3000;
const SEARCH_DELAY_MS = 250;

const useDebounced = (value: string, delay = SEARCH_DELAY_MS) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};

const SERVICE_LABELS: Record<string, string> = {
    backend: 'Backend',
    frontend: 'Frontend',
    socket: 'Socket',
};

const dayKey = (date: any) => new Date(date).toDateString();

const clock = (date: any) => {
    const value = new Date(date);

    return `${value.toLocaleTimeString([], { hour12: false })}.${String(value.getMilliseconds()).padStart(3, '0')}`;
};

const statusOf = (entry: any) => {
    const status = Number(entry.data?.status);

    return Number.isFinite(status) && status > 0 ? status : null;
};

const statusTone = (status: number | null) =>
    status === null
        ? ''
        : status >= 500
          ? ' rt_status_error'
          : status >= 400
            ? ' rt_status_warn'
            : status >= 200 && status < 300
              ? ' rt_status_ok'
              : '';

// 1000 ms is the backend's slow-request threshold (SLOW_REQUEST_MS)
const WARN_MS = 300;
const SLOW_MS = 1000;

const tookTone = (ms: number) =>
    !Number.isFinite(ms)
        ? ''
        : ms >= SLOW_MS
          ? ' rt_took_slow'
          : ms >= WARN_MS
            ? ' rt_took_warn'
            : ' rt_took_fast';

const withKeys = (list: any[]) => {
    const seen = new Map<string, number>();

    return list.map((entry: any) => {
        const base = `${entry.service}|${entry.ts}|${entry.msg}|${entry.data?.request_id ?? ''}`;
        const count = seen.get(base) ?? 0;

        seen.set(base, count + 1);

        return { entry, key: `${base}#${count}` };
    });
};

const RuntimeRow = ({
    entry,
    expanded,
    onToggle,
    onPrev,
    onNext,
    position,
    total,
    hasMore,
    onFindTrace,
}: any) => {
    const itemRef = useRef<any>(null);
    const { mounted, visible } = useOverlayPresence(expanded);
    const status = statusOf(entry);
    const ms = Number(entry.data?.total_ms);
    const note = entry.data?.error_message;

    useEffect(() => {
        if (expanded) {
            itemRef.current?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [expanded]);

    return (
        <div
            ref={itemRef}
            className={`log_item${expanded ? ' log_item_expanded' : ''}`}
        >
            <div
                className={`log_row rt_log_row log_row_level_${entry.level}`}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={onToggle}
                onKeyDown={(event: any) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onToggle();
                    }
                }}
            >
                <span
                    className="log_row_level"
                    title={LEVELS[entry.level as keyof typeof LEVELS]}
                />
                <span className="rt_time">{clock(entry.ts)}</span>
                <span className="rt_source">
                    {SERVICE_LABELS[entry.service] ?? entry.service}
                </span>
                <span className="rt_msg">
                    {entry.msg}
                    {queryString(entry.data?.query) ? (
                        <span className="rt_query">
                            {queryString(entry.data?.query)}
                        </span>
                    ) : null}
                    {note ? <span className="rt_note">{note}</span> : null}
                </span>
                <span className={`rt_status${statusTone(status)}`}>
                    {status ?? ''}
                </span>
                <span className={`rt_took${tookTone(ms)}`}>
                    {Number.isFinite(ms) ? formatDuration(ms) : ''}
                </span>
                <ChevronDownIcon className="log_row_chevron" />
            </div>
            <div
                className={`log_item_collapse${visible ? ' log_item_collapse_open' : ''}`}
            >
                <div className="log_item_collapse_inner">
                    {mounted ? (
                        <RuntimeLogDetails
                            entry={entry}
                            onPrev={onPrev}
                            onNext={onNext}
                            position={position}
                            total={total}
                            hasMore={hasMore}
                            onFindTrace={onFindTrace}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const RuntimeLogs = () => {
    const { showToast } = useContext(AppContext);
    const {
        searchText,
        setSearchText,
        levelFilter,
        setLevelFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        statusFilter,
        setStatusFilter,
        minMs,
        setMinMs,
        maxMs,
        setMaxMs,
        live,
        setLive,
        services,
        setServices,
    } = useLogsToolbar();
    const [items, setItems] = useState<any[]>([]);
    // cursors of the loaded window: older entries (`before`) and newer
    // entries (`after`, null while the window starts at the newest entry)
    const [next, setNext] = useState<string | null>(null);
    const [prev, setPrev] = useState<string | null>(null);
    const [available, setAvailable] = useState<boolean>(true);
    const [loadedKey, setLoadedKey] = useState<string>('');
    const loadedRef = useRef<string>('');
    const itemsRef = useRef<any[]>(items);
    const prevRef = useRef<string | null>(prev);
    const [loadingNext, setLoadingNext] = useState<boolean>(false);
    const [loadingPrev, setLoadingPrev] = useState<boolean>(false);
    const busyRef = useRef<boolean>(false);
    const [search, setSearch] = useState<string>(searchText.trim());
    const [expanded, setExpanded] = useState<any>(() => new Set());
    const status = useDebounced(statusFilter);
    const from = useDebounced(minMs);
    const upTo = useDebounced(maxMs);

    itemsRef.current = items;
    prevRef.current = prev;

    useEffect(() => {
        const timer = setTimeout(
            () => setSearch(searchText.trim()),
            SEARCH_DELAY_MS,
        );

        return () => clearTimeout(timer);
    }, [searchText]);

    const sources = services.join(',');

    // `limit` is the size of one fetch: the whole window for a fresh load,
    // a single chunk when scrolling
    const query = useCallback(
        (
            cursor: { before?: string | null; after?: string | null } = {},
            limit = LOG_WINDOW,
        ) => {
            const params: any = { sources, limit };

            if (levelFilter !== 'all') {
                params.level = levelFilter;
            }

            if (search) {
                params.q = search;
            }

            if (dateFrom) {
                params.from = new Date(dateFrom).toISOString();
            }

            if (dateTo) {
                params.to = new Date(dateTo).toISOString();
            }

            if (status) {
                params.status = status;
            }

            if (from) {
                params.min_ms = from;
            }

            if (upTo) {
                params.max_ms = upTo;
            }

            if (cursor.before) {
                params.before = cursor.before;
            }

            if (cursor.after) {
                params.after = cursor.after;
            }

            return params;
        },
        [sources, levelFilter, search, dateFrom, dateTo, status, from, upTo],
    );

    const load = useCallback(
        async (silent = false) => {
            const params = query();
            const paramsKey = JSON.stringify(params);

            if (!sources) {
                setItems([]);
                setNext(null);
                setAvailable(true);
                loadedRef.current = paramsKey;
                setLoadedKey(paramsKey);
                return;
            }

            if (silent && loadedRef.current !== paramsKey) {
                return;
            }

            const result = await getRuntimeLogs(params);

            if (!result?.status) {
                if (!silent) {
                    showToast({
                        type: 'error',
                        message: result?.message || 'Failed to load logs',
                    });
                    loadedRef.current = paramsKey;
                    setLoadedKey(paramsKey);
                }

                return;
            }

            const fetched: any[] = result.data?.items || [];

            if (silent) {
                // new entries only belong on top while the window starts at
                // the newest entry; otherwise they come in when scrolling up
                if (prevRef.current !== null) {
                    return;
                }

                const current = itemsRef.current;
                const known = new Set(
                    withKeys(current).map((item) => item.key),
                );
                const fresh = withKeys(fetched)
                    .filter((item) => !known.has(item.key))
                    .map((item) => item.entry);

                if (!fresh.length) {
                    return;
                }

                const merged = [...fresh, ...current];

                if (merged.length > LOG_WINDOW) {
                    const kept = merged.slice(0, LOG_WINDOW);

                    // what fell off the bottom is loaded again when scrolling
                    setItems(kept);
                    setNext(kept[kept.length - 1].ts);
                } else {
                    setItems(merged);
                }

                return;
            }

            setItems(fetched);
            setNext(result.data?.next ?? null);
            setPrev(null);
            setAvailable(result.data?.available !== false);
            loadedRef.current = paramsKey;
            setLoadedKey(paramsKey);
        },
        [query, showToast, sources],
    );

    // older entries: append, and drop the top of the window when it is full
    const loadNext = useCallback(async () => {
        if (!next || busyRef.current) {
            return;
        }

        const key = loadedRef.current;

        busyRef.current = true;
        setLoadingNext(true);

        const result = await getRuntimeLogs(query({ before: next }, LOG_CHUNK));

        busyRef.current = false;
        setLoadingNext(false);

        if (!result?.status || loadedRef.current !== key) {
            return;
        }

        const merged = [...itemsRef.current, ...(result.data?.items || [])];
        const dropped = Math.max(0, merged.length - LOG_WINDOW);
        const kept = merged.slice(dropped);

        setItems(kept);
        setNext(result.data?.next ?? null);

        if (dropped) {
            // entries above the window are fetched with `after` on the way up
            setPrev(kept[0].ts);
        }
    }, [next, query]);

    // newer entries: prepend, and drop the bottom of the window when it is full
    const loadPrev = useCallback(async () => {
        if (!prev || busyRef.current) {
            return;
        }

        const key = loadedRef.current;

        busyRef.current = true;
        setLoadingPrev(true);

        const result = await getRuntimeLogs(query({ after: prev }, LOG_CHUNK));

        busyRef.current = false;
        setLoadingPrev(false);

        if (!result?.status || loadedRef.current !== key) {
            return;
        }

        const merged = [...(result.data?.items || []), ...itemsRef.current];
        const kept = merged.slice(0, LOG_WINDOW);

        setItems(kept);
        setPrev(result.data?.prev ?? null);

        if (merged.length > LOG_WINDOW) {
            setNext(kept[kept.length - 1].ts);
        }
    }, [prev, query]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!live) {
            return;
        }

        const timer = setInterval(() => {
            if (!document.hidden) {
                load(true);
            }
        }, LIVE_MS);

        return () => clearInterval(timer);
    }, [live, load]);

    const toggle = (id: string) =>
        setExpanded((prev: any) => {
            const copy = new Set(prev);

            if (copy.has(id)) {
                copy.delete(id);
            } else {
                copy.add(id);
            }

            return copy;
        });

    const loading = loadedKey !== JSON.stringify(query());
    const keyed = useMemo(() => withKeys(items), [items]);
    const activeFilters =
        Number(Boolean(searchText.trim())) +
        Number(levelFilter !== 'all') +
        Number(Boolean(dateFrom)) +
        Number(Boolean(dateTo)) +
        Number(Boolean(statusFilter)) +
        Number(Boolean(minMs || maxMs)) +
        Number(services.length !== RUNTIME_SERVICES.length);

    return (
        <>
            <LogsFilters activeCount={activeFilters}>
                <LogSearch
                    value={searchText}
                    onChange={setSearchText}
                    placeholder="Search by text, path, error, user or request id"
                    length={200}
                />
                <LogsActions
                    live={live}
                    setLive={setLive}
                    busy={loading}
                    onReload={() => load()}
                />
                <FilterField label="Services">
                    <ServiceChecks value={services} onChange={setServices} />
                </FilterField>
                <FilterField label="Level">
                    <SearchSelect
                        multiple="pinned"
                        options={LEVEL_OPTIONS}
                        value={levelValues(levelFilter)}
                        placeholder="All levels"
                        onChange={(values: string[]) =>
                            setLevelFilter(levelFromValues(values))
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
                <FilterField label="Error">
                    <LogSearch
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(digitsOnly(value))}
                        placeholder="Status code, e.g. 500"
                        length={3}
                        inputMode="numeric"
                    />
                </FilterField>
                <FilterField label="Timing">
                    <LogSearch
                        value={minMs}
                        onChange={(value) => setMinMs(digitsOnly(value))}
                        placeholder="From, ms"
                        length={7}
                        inputMode="numeric"
                    />
                    <LogSearch
                        value={maxMs}
                        onChange={(value) => setMaxMs(digitsOnly(value))}
                        placeholder="To, ms"
                        length={7}
                        inputMode="numeric"
                    />
                </FilterField>
            </LogsFilters>

            <div className="logs_list">
                <div className="rt_head">
                    <span />
                    <span>Time</span>
                    <span>Source</span>
                    <span>Message</span>
                    <span>Status</span>
                    <span>Duration</span>
                    <span />
                </div>
                {loading && !items.length ? (
                    <Loading size={40} />
                ) : items.length ? (
                    <InfiniteScroll
                        hasNext={Boolean(next)}
                        loadingNext={loadingNext}
                        onLoadNext={loadNext}
                        hasPrev={Boolean(prev)}
                        loadingPrev={loadingPrev}
                        onLoadPrev={loadPrev}
                    >
                        {keyed.map(({ entry, key }, index) => (
                            <Fragment key={key}>
                                {index === 0 ||
                                dayKey(keyed[index - 1].entry.ts) !==
                                    dayKey(entry.ts) ? (
                                    <div className="logs_day">
                                        {format_message_date_label(entry.ts)}
                                    </div>
                                ) : null}
                                <RuntimeRow
                                    entry={entry}
                                    expanded={expanded.has(key)}
                                    onToggle={() => toggle(key)}
                                    onPrev={
                                        keyed[index - 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          keyed[index - 1].key,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                    onNext={
                                        keyed[index + 1]
                                            ? () =>
                                                  setExpanded(
                                                      new Set([
                                                          keyed[index + 1].key,
                                                      ]),
                                                  )
                                            : undefined
                                    }
                                    position={index + 1}
                                    total={keyed.length}
                                    hasMore={Boolean(next)}
                                    onFindTrace={(id: string) => {
                                        setServices(RUNTIME_SERVICES);
                                        setSearchText(id);
                                    }}
                                />
                            </Fragment>
                        ))}
                    </InfiniteScroll>
                ) : (
                    <p className="logs_empty">
                        {available
                            ? 'No log entries'
                            : 'Log files are not available for the selected services'}
                    </p>
                )}
            </div>
        </>
    );
};

export default RuntimeLogs;
