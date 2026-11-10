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

import { getRuntimeLogs } from '../../api/logs.api';
import { format_message_date_label } from '../../utils/format';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import PlayIcon from '../../assets/svg/play.svg';
import PauseIcon from '../../assets/svg/pause.svg';
import RefreshIcon from '../../assets/svg/refresh.svg';

import SearchSelect from '../../components/Ui/SearchSelect';
import ActionButton from '../../components/Ui/ActionButton';
import DateTimeField from '../../components/Ui/DateTimeField';
import Loading from '../../components/Ui/Loading';
import InfiniteScroll from '../../components/Ui/InfiniteScroll';
import { useOverlayPresence } from '../../components/Ui/useOverlayEnter';

import LogSearch from './LogSearch';
import RuntimeLogDetails from './RuntimeLogDetails';
import { useLogsToolbar } from './logsToolbar';
import { formatDuration } from './logFormat';
import { LEVELS } from './logTypes';

import './Logs.scss';
import './RuntimeLogs.scss';

const PAGE_SIZE = 100;
const LIVE_MS = 3000;
const SEARCH_DELAY_MS = 250;

const LEVEL_OPTIONS = [
    { value: 'all', name: 'All levels' },
    { value: 'problems', name: 'Problems only' },
    { value: 'error', name: 'Errors' },
    { value: 'warn', name: 'Warnings' },
    { value: 'info', name: 'Info' },
];

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

const RuntimeRow = ({
    entry,
    expanded,
    onToggle,
    onPrev,
    onNext,
    position,
    total,
    hasMore,
    onFindRequest,
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
                <span className="rt_msg">
                    {entry.msg}
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
                            onFindRequest={onFindRequest}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const RuntimeLogs = ({ source }: { source: string }) => {
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
    } = useLogsToolbar();
    const [items, setItems] = useState<any[]>([]);
    const [next, setNext] = useState<string | null>(null);
    const [available, setAvailable] = useState<boolean>(true);
    const [loadedKey, setLoadedKey] = useState<string>('');
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

    const query = useCallback(
        (before?: string | null) => {
            const params: any = { source, limit: PAGE_SIZE };

            if (levelFilter !== 'all') {
                params.level =
                    levelFilter === 'problems' ? 'warn,error' : levelFilter;
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
        [source, levelFilter, search, dateFrom, dateTo],
    );

    const load = useCallback(async () => {
        const params = query();
        const result = await getRuntimeLogs(params);

        if (!result?.status) {
            showToast({
                type: 'error',
                message: result?.message || 'Failed to load logs',
            });
            setLoadedKey(JSON.stringify(params));
            return;
        }

        setItems(result.data?.items || []);
        setNext(result.data?.next ?? null);
        setAvailable(result.data?.available !== false);
        setLoadedKey(JSON.stringify(params));
    }, [query, showToast]);

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
                load();
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
    const keyOf = (entry: any, index: number) => `${entry.ts}-${index}`;

    return (
        <div className="logs_page">
            <div className="logs_toolbar">
                <div className="logs_toolbar_row logs_toolbar_row_top">
                    <div className="logs_toolbar_search">
                        <LogSearch
                            value={searchText}
                            onChange={setSearchText}
                            placeholder="Search by text, path, error, user or request id"
                            length={200}
                        />
                    </div>
                    <div className="logs_toolbar_actions">
                        <ActionButton
                            size="lg"
                            className={live ? 'logs_live_active' : ''}
                            onClick={() => setLive((value: boolean) => !value)}
                        >
                            {live ? <PauseIcon /> : <PlayIcon />}
                            Live
                        </ActionButton>
                        <ActionButton
                            size="lg"
                            onClick={() => load()}
                            isLoading={loading || live}
                            loaderVariant="segments"
                            className="logs_reload"
                        >
                            <RefreshIcon />
                        </ActionButton>
                    </div>
                </div>
                <div className="logs_toolbar_row">
                    <div className="logs_toolbar_level">
                        <SearchSelect
                            options={LEVEL_OPTIONS}
                            value={levelFilter}
                            placeholder="Level"
                            onChange={(value: any) =>
                                setLevelFilter(value || 'all')
                            }
                        />
                    </div>
                    <div className="logs_toolbar_range">
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
                    </div>
                </div>
            </div>

            <div className="logs_list">
                <div className="rt_head">
                    <span />
                    <span>Time</span>
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
                        {items.map((entry: any, index: number) => {
                            const id = keyOf(entry, index);

                            return (
                                <Fragment key={id}>
                                    {index === 0 ||
                                    dayKey(items[index - 1].ts) !==
                                        dayKey(entry.ts) ? (
                                        <div className="logs_day">
                                            {format_message_date_label(
                                                entry.ts,
                                            )}
                                        </div>
                                    ) : null}
                                    <RuntimeRow
                                        entry={entry}
                                        expanded={expanded.has(id)}
                                        onToggle={() => toggle(id)}
                                        onPrev={
                                            items[index - 1]
                                                ? () =>
                                                      setExpanded(
                                                          new Set([
                                                              keyOf(
                                                                  items[
                                                                      index - 1
                                                                  ],
                                                                  index - 1,
                                                              ),
                                                          ]),
                                                      )
                                                : undefined
                                        }
                                        onNext={
                                            items[index + 1]
                                                ? () =>
                                                      setExpanded(
                                                          new Set([
                                                              keyOf(
                                                                  items[
                                                                      index + 1
                                                                  ],
                                                                  index + 1,
                                                              ),
                                                          ]),
                                                      )
                                                : undefined
                                        }
                                        position={index + 1}
                                        total={items.length}
                                        hasMore={Boolean(next)}
                                        onFindRequest={(requestId: string) =>
                                            setSearchText(requestId)
                                        }
                                    />
                                </Fragment>
                            );
                        })}
                    </InfiniteScroll>
                ) : (
                    <p className="logs_empty">
                        {available
                            ? 'No log entries'
                            : 'Log files are not available for this service'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default RuntimeLogs;
