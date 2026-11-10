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
    useLogsToolbar,
} from './logsToolbar';
import { formatDuration } from './logFormat';
import { LEVELS } from './logTypes';

import './Logs.scss';
import './RuntimeLogs.scss';

const PAGE_SIZE = 100;
const LIVE_MS = 3000;
const SEARCH_DELAY_MS = 250;

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
            : '';

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
                <span className="rt_took">
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
        live,
        setLive,
        services,
        setServices,
    } = useLogsToolbar();
    const [items, setItems] = useState<any[]>([]);
    const [next, setNext] = useState<string | null>(null);
    const [available, setAvailable] = useState<boolean>(true);
    const [loadedKey, setLoadedKey] = useState<string>('');
    const loadedRef = useRef<string>('');
    const [loadingNext, setLoadingNext] = useState<boolean>(false);
    const [search, setSearch] = useState<string>(searchText.trim());
    const [expanded, setExpanded] = useState<any>(() => new Set());

    useEffect(() => {
        const timer = setTimeout(
            () => setSearch(searchText.trim()),
            SEARCH_DELAY_MS,
        );

        return () => clearTimeout(timer);
    }, [searchText]);

    const sources = services.join(',');

    const query = useCallback(
        (before?: string | null) => {
            const params: any = { sources, limit: PAGE_SIZE };

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

            if (before) {
                params.before = before;
            }

            return params;
        },
        [sources, levelFilter, search, dateFrom, dateTo],
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
                setItems((prev: any[]) => {
                    const known = new Set(
                        withKeys(prev).map((item) => item.key),
                    );
                    const fresh = withKeys(fetched)
                        .filter((item) => !known.has(item.key))
                        .map((item) => item.entry);

                    return fresh.length ? [...fresh, ...prev] : prev;
                });

                return;
            }

            setItems(fetched);
            setNext(result.data?.next ?? null);
            setAvailable(result.data?.available !== false);
            loadedRef.current = paramsKey;
            setLoadedKey(paramsKey);
        },
        [query, showToast, sources],
    );

    const loadNext = useCallback(async () => {
        if (!next || loadingNext) {
            return;
        }

        setLoadingNext(true);

        const result = await getRuntimeLogs(query(next));

        if (result?.status) {
            setItems((prev: any[]) => [...prev, ...(result.data?.items || [])]);
            setNext(result.data?.next ?? null);
        }

        setLoadingNext(false);
    }, [next, loadingNext, query]);

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
