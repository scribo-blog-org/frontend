'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from '@/navigation';

import { AppContext } from '@/providers/AppProviders';
import { getDashboard } from '../../api/analytics.api';
import { hashtagSearchPath } from '../../utils/hashtags';

import Tabs from '../../components/Ui/Tabs';
import Loading from '../../components/Ui/Loading';

import './Dashboard.scss';

const RANGES = [
    { value: '24h', label: '24 hours' },
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
];

const TRAFFIC_KEYS = [
    { key: 'visits', label: 'Visits', color: 'var(--text-color)' },
];

const TIMING_KEYS = [
    { key: 'avg_ms', label: 'Total', color: 'var(--text-color)' },
    {
        key: 'db_ms',
        label: 'Waiting for the database',
        color: 'var(--light-text-color)',
    },
];

const formatDay = (iso: any) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
    });
};

const formatHour = (iso: any) => {
    const date = new Date(`${iso}:00:00Z`);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatRange = (range: any) => {
    if (range === '24h') {
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        };
        return `${start.toLocaleString('ru-RU', options)} — ${end.toLocaleString('ru-RU', options)}`;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - range + 1);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
    };
    return `${start.toLocaleDateString('ru-RU', options)} — ${end.toLocaleDateString('ru-RU', options)}`;
};

const formatNumber = (value: any) =>
    new Intl.NumberFormat('ru-RU').format(value || 0);

const formatMs = (value: any) => {
    const ms = Number(value || 0);
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)} s`;
    }
    return `${Math.round(ms)} ms`;
};

const formatPercent = (share: any) => {
    const percent = Number(share || 0) * 100;
    if (percent > 0 && percent < 1) {
        return '<1%';
    }
    return `${Math.round(percent)}%`;
};

const routeLabel = (route: string) => route.replace(' /api', ' ');

const deltaLabel = (current: any, previous: any) => {
    if (previous == null) {
        return null;
    }

    const curr = Number(current || 0);
    const prev = Number(previous || 0);

    if (!prev && !curr) {
        return null;
    }

    if (!prev) {
        return { text: 'No data for the previous period', tone: 'flat' };
    }

    const abs = curr - prev;
    if (abs === 0) {
        return { text: 'no changes', tone: 'flat' };
    }

    return {
        text: `${abs > 0 ? '+' : ''}${formatNumber(abs)} compared with the previous period`,
        tone: abs > 0 ? 'up' : 'down',
    };
};

const TrendChart = ({
    series,
    keys,
    hourly = false,
    format = formatNumber,
}: any) => {
    const formatTick = hourly ? formatHour : formatDay;
    const [hover, setHover] = useState<any>(null);
    const [cursor, setCursor] = useState<any>(null);
    const width = 720;
    const height = 248;
    const pad = { top: 16, right: 12, bottom: 32, left: 36 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;

    const maxValue = Math.max(
        1,
        ...series.flatMap((point: any) =>
            keys.map((item: any) => Number(point[item.key] || 0)),
        ),
    );

    const moveCursor = (event: any) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setCursor({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            w: rect.width,
            h: rect.height,
        });
    };

    const toX = (index: any) => {
        if (series.length <= 1) {
            return pad.left;
        }
        return pad.left + (index / (series.length - 1)) * innerWidth;
    };

    const toY = (value: any) =>
        pad.top + innerHeight - (value / maxValue) * innerHeight;

    const polylines = keys.map((item: any) => ({
        ...item,
        points: series
            .map(
                (point: any, index: any) =>
                    `${toX(index)},${toY(Number(point[item.key] || 0))}`,
            )
            .join(' '),
    }));

    const areaPath = (() => {
        if (!series.length) {
            return '';
        }
        const first = polylines[0];
        const start = `${toX(0)},${toY(0)}`;
        const end = `${toX(series.length - 1)},${toY(0)}`;
        return `M ${start} L ${first.points} L ${end} Z`;
    })();

    const ticks = series.filter((_: any, index: any) => {
        if (series.length <= 8) {
            return true;
        }
        return (
            index === 0 ||
            index === series.length - 1 ||
            index % Math.ceil(series.length / 6) === 0
        );
    });

    const yTicks = [0, 0.5, 1].map((ratio: any) =>
        Math.round(maxValue * ratio),
    );
    const hitWidth = series.length ? innerWidth / series.length : innerWidth;
    const active = hover != null ? series[hover] : null;

    const tooltipStyle = cursor
        ? {
              left: cursor.x,
              top: cursor.y,
              transform: `translate(${cursor.x > cursor.w * 0.62 ? 'calc(-100% - 12px)' : '12px'}, ${
                  cursor.y > cursor.h * 0.7 ? 'calc(-100% - 8px)' : '8px'
              })`,
          }
        : undefined;

    return (
        <div
            className="analytics_chart_wrap"
            onMouseMove={moveCursor}
            onMouseLeave={() => {
                setHover(null);
                setCursor(null);
            }}
        >
            <svg
                className="analytics_chart"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
            >
                {yTicks.map((value: any) => (
                    <g key={value}>
                        <line
                            className="analytics_chart_grid"
                            x1={pad.left}
                            y1={toY(value)}
                            x2={pad.left + innerWidth}
                            y2={toY(value)}
                        />
                        <text
                            className="analytics_chart_ytick"
                            x={pad.left - 8}
                            y={toY(value) + 3}
                            textAnchor="end"
                        >
                            {format(value)}
                        </text>
                    </g>
                ))}
                {areaPath ? (
                    <path
                        className="analytics_chart_area"
                        d={areaPath}
                        fill={keys[0]?.color}
                    />
                ) : null}
                {polylines.map((line: any) => (
                    <polyline
                        key={line.key}
                        className="analytics_chart_line"
                        points={line.points}
                        stroke={line.color}
                        fill="none"
                    />
                ))}
                {active ? (
                    <g className="analytics_chart_hint">
                        <line
                            className="analytics_chart_guide"
                            x1={toX(hover)}
                            y1={pad.top}
                            x2={toX(hover)}
                            y2={pad.top + innerHeight}
                        />
                        {keys.map((item: any) => (
                            <circle
                                key={item.key}
                                className="analytics_chart_dot"
                                cx={toX(hover)}
                                cy={toY(Number(active[item.key] || 0))}
                                r={4}
                                fill={item.color}
                            />
                        ))}
                    </g>
                ) : null}
                {series.map((point: any, index: any) => (
                    <rect
                        className="app-transition"
                        key={`hit-${point.date}`}
                        x={toX(index) - hitWidth / 2}
                        y={pad.top}
                        width={hitWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseEnter={() => setHover(index)}
                    />
                ))}
                {ticks.map((point: any) => {
                    const index = series.indexOf(point);
                    return (
                        <text
                            key={point.date}
                            className="analytics_chart_tick"
                            x={toX(index)}
                            y={height - 8}
                            textAnchor="middle"
                        >
                            {formatTick(point.date)}
                        </text>
                    );
                })}
            </svg>
            {active && cursor ? (
                <div className="analytics_chart_tooltip" style={tooltipStyle}>
                    <p>{formatTick(active.date)}</p>
                    {keys.map((item: any) => (
                        <p key={item.key}>
                            {item.label}: {format(active[item.key])}
                        </p>
                    ))}
                </div>
            ) : null}
            {keys.length > 1 ? (
                <div className="analytics_legend">
                    {keys.map((item: any) => (
                        <span className="analytics_legend_item" key={item.key}>
                            <span
                                className="analytics_legend_swatch"
                                style={{ background: item.color }}
                            />
                            {item.label}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

const RankedBars = ({ items, empty, wideLabel }: any) => {
    const maxValue = Math.max(
        1,
        ...items.map((item: any) => item.count || item.visits || 0),
    );

    if (!items.length) {
        return (
            <p className="analytics_empty">
                {empty || 'No data for this period'}
            </p>
        );
    }

    return (
        <div
            className={`analytics_bars${wideLabel ? ' analytics_bars_wide' : ''}`}
        >
            {items.map((item: any) => {
                const label =
                    item.label ||
                    item.type ||
                    item.path ||
                    item.query ||
                    item.tag ||
                    item.title;
                const value =
                    item.count ?? item.visits ?? item.views_count ?? 0;
                const note = item.note || null;

                return (
                    <div className="analytics_bars_row" key={item.key || label}>
                        {item.href ? (
                            <Link
                                className={`analytics_bars_label${item.hashtag ? ' hashtag' : ''}`}
                                href={item.href}
                                title={label}
                            >
                                {label}
                            </Link>
                        ) : (
                            <p className="analytics_bars_label" title={label}>
                                {label}
                            </p>
                        )}
                        <div className="analytics_bars_track">
                            <div
                                className="analytics_bars_fill app-transition"
                                style={{
                                    width: `${Math.max(6, (value / maxValue) * 100)}%`,
                                }}
                            />
                        </div>
                        <p className="analytics_bars_value">
                            {item.valueLabel || formatNumber(value)}
                            {note ? <span> · {note}</span> : null}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

const AnalyticsGroup = ({ title, hint, className, children }: any) => (
    <section className={`analytics_group ${className || ''}`.trim()}>
        <div className="analytics_group_head">
            <h2 className="kicker">{title}</h2>
            {hint ? <p className="analytics_group_hint">{hint}</p> : null}
        </div>
        {children}
    </section>
);

const AnalyticsScope = ({ title, hint, className, children }: any) => (
    <section className={`analytics_scope ${className || ''}`.trim()}>
        <header className="analytics_scope_head">
            <h2 className="kicker">{title}</h2>
            {hint ? <p className="analytics_scope_hint">{hint}</p> : null}
        </header>
        <div className="analytics_scope_body">{children}</div>
    </section>
);

const StatCard = ({ label, value, display, previous, hint }: any) => {
    const delta = previous == null ? null : deltaLabel(value, previous);

    return (
        <div className="analytics_stat app-transition">
            <p className="analytics_stat_label">{label}</p>
            <p className="analytics_stat_value">
                {display ?? formatNumber(value)}
            </p>
            {hint ? <p className="analytics_stat_hint">{hint}</p> : null}
            {delta ? (
                <p
                    className={`analytics_stat_delta analytics_stat_delta_${delta.tone}`}
                >
                    {delta.text}
                </p>
            ) : null}
        </div>
    );
};

const ActivityMetric = ({ label, value }: any) => (
    <div className="analytics_activity_metric">
        <p className="analytics_activity_metric_label">{label}</p>
        <p className="analytics_activity_metric_value">{formatNumber(value)}</p>
    </div>
);

const ActivityPanel = ({ activity }: any) => (
    <section className="analytics_block analytics_activity app-transition">
        <div className="analytics_activity_group">
            <h3 className="analytics_block_title">Posts</h3>
            <div className="analytics_activity_metrics">
                <ActivityMetric
                    label="Written"
                    value={activity?.posts?.created}
                />
                <ActivityMetric
                    label="Updated"
                    value={activity?.posts?.updated}
                />
                <ActivityMetric
                    label="Deleted"
                    value={activity?.posts?.deleted}
                />
            </div>
        </div>
        <div className="analytics_activity_group">
            <h3 className="analytics_block_title">Users</h3>
            <div className="analytics_activity_metrics">
                <ActivityMetric
                    label="New"
                    value={activity?.users?.registered}
                />
                <ActivityMetric
                    label="Sign-ins"
                    value={activity?.users?.logins}
                />
            </div>
        </div>
        <div className="analytics_activity_group">
            <h3 className="analytics_block_title">Comments</h3>
            <div className="analytics_activity_metrics">
                <ActivityMetric
                    label="Written"
                    value={activity?.comments?.created}
                />
                <ActivityMetric
                    label="Updated"
                    value={activity?.comments?.updated}
                />
                <ActivityMetric
                    label="Deleted"
                    value={activity?.comments?.deleted}
                />
            </div>
        </div>
        <div className="analytics_activity_group">
            <h3 className="analytics_block_title">Likes</h3>
            <div className="analytics_activity_metrics">
                <ActivityMetric
                    label="On posts"
                    value={activity?.likes?.posts}
                />
            </div>
        </div>
    </section>
);

const PlacesList = ({ title, hint, items, empty }: any) => (
    <section className="analytics_block app-transition">
        <h3 className="analytics_block_title">{title}</h3>
        {hint ? <p className="analytics_block_hint">{hint}</p> : null}
        <RankedBars items={items} wideLabel empty={empty} />
    </section>
);

const DashboardPage = () => {
    const { showToast } = useContext(AppContext);
    const [range, setRange] = useState<any>(14);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<any>(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            const result = await getDashboard(range);

            if (cancelled) {
                return;
            }

            if (!result?.status) {
                showToast({
                    type: 'error',
                    message: result?.message || 'Could not load analytics',
                });
                setData(null);
                setIsLoading(false);
                return;
            }

            setData(result.data);
            setIsLoading(false);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [range, showToast]);

    const totals = data?.totals || {};
    const series = data?.series || [];
    const audience = data?.audience || {};
    const places = data?.places || {};
    const timings = data?.timings || {};
    const isHourlyRange = range === '24h';

    const placeRows = (items: any[] = []) =>
        items.map((item: any) => ({
            key: item.label,
            label: item.label,
            count: item.count,
            valueLabel: `${formatNumber(item.count)} · ${formatPercent(item.share)}`,
        }));
    const topPlaces = useMemo(() => placeRows(places.top), [places]);
    const bottomPlaces = useMemo(() => placeRows(places.bottom), [places]);

    const slowest = useMemo(
        () =>
            (timings.slowest || []).map((item: any) => ({
                key: item.route,
                label: routeLabel(item.route),
                count: item.avg_ms,
                valueLabel: formatMs(item.avg_ms),
                note: `p95 ${formatMs(item.p95_ms)} · DB ${formatMs(item.db_avg_ms)}`,
            })),
        [timings],
    );

    const topPosts = useMemo(
        () =>
            (data?.top_posts || []).map((item: any) => ({
                key: String(item._id),
                title: item.title,
                count: item.views_count || 0,
                href: `/posts/${item._id}`,
            })),
        [data],
    );
    const topHashtags = useMemo(
        () =>
            (data?.top_hashtags || []).map((item: any) => ({
                key: item.tag,
                tag: item.tag,
                count: item.uses || 0,
                href: hashtagSearchPath(item.tag),
                hashtag: true,
            })),
        [data],
    );

    const activeRange = RANGES.find((item: any) => item.value === range);
    const hasTimings = Number(timings.requests || 0) > 0;
    const apps = Number(timings.avg_ms || 0) - Number(timings.db_avg_ms || 0);

    return (
        <div className="analytics">
            <div className="analytics_period_panel">
                <div className="analytics_period_controls">
                    <p className="analytics_period_label">Period</p>
                    <Tabs
                        label="Period"
                        items={RANGES.map((item: any) => ({
                            key: item.value,
                            title: item.label,
                        }))}
                        activeKey={range}
                        onChange={setRange}
                    />
                </div>
                <p className="analytics_period_bounds">
                    <span className="analytics_period_bounds_label">Range</span>
                    {formatRange(range)}
                </p>
            </div>

            {isLoading ? (
                <Loading size={40} />
            ) : (
                <>
                    <AnalyticsScope
                        title="For the selected period"
                        hint={`The metrics below count only ${activeRange?.label?.toLowerCase() || 'period'}`}
                        className="analytics_scope_period"
                    >
                        <AnalyticsGroup
                            title="Visits"
                            hint="By day, and by hour for the last 24 hours"
                        >
                            <div className="analytics_stats">
                                <StatCard
                                    label="Visits"
                                    value={totals.visits}
                                    previous={totals.visits_prev}
                                />
                                <StatCard
                                    label="Signed-in visits"
                                    value={audience.authorized_visits}
                                    display={formatPercent(
                                        audience.authorized_share,
                                    )}
                                    hint={`${formatNumber(audience.authorized_visits)} of ${formatNumber(totals.visits)} visits`}
                                />
                                <StatCard
                                    label="Unique signed-in users"
                                    value={audience.unique_authorized}
                                    hint="Different accounts that visited"
                                />
                            </div>
                            <section className="analytics_block analytics_block_chart app-transition">
                                {series.length ? (
                                    <TrendChart
                                        series={series}
                                        keys={TRAFFIC_KEYS}
                                        hourly={isHourlyRange}
                                    />
                                ) : (
                                    <p className="analytics_empty">
                                        No visits for this period
                                    </p>
                                )}
                            </section>
                        </AnalyticsGroup>

                        <AnalyticsGroup
                            title="Where visitors come from"
                            hint="Cities, by number of visits"
                        >
                            <div className="analytics_grid">
                                <PlacesList
                                    title="Most active"
                                    items={topPlaces}
                                    empty="Locations are collected from the moment this update is live"
                                />
                                <PlacesList
                                    title="Least active"
                                    items={bottomPlaces}
                                    empty={
                                        places.total_places
                                            ? 'All cities are listed in the most active column'
                                            : 'No locations yet'
                                    }
                                />
                            </div>
                            {places.unknown_visits ? (
                                <p className="analytics_group_note">
                                    {formatNumber(places.unknown_visits)} visits
                                    without a known location are not included
                                </p>
                            ) : null}
                        </AnalyticsGroup>

                        <AnalyticsGroup
                            title="Response time"
                            hint="From the moment the server gets a request until it answers"
                        >
                            {hasTimings ? (
                                <>
                                    <div className="analytics_stats">
                                        <StatCard
                                            label="Typical wait"
                                            display={formatMs(timings.p50_ms)}
                                            hint="Half of the requests are faster"
                                        />
                                        <StatCard
                                            label="Slow requests"
                                            display={formatMs(timings.p95_ms)}
                                            hint="95% of requests are faster"
                                        />
                                        <StatCard
                                            label="Average"
                                            display={formatMs(timings.avg_ms)}
                                            hint={`${formatMs(timings.db_avg_ms)} of it is waiting for the database (${formatPercent(timings.db_share)})`}
                                        />
                                        <StatCard
                                            label="Requests"
                                            value={timings.requests}
                                            hint={`Slowest took ${formatMs(timings.max_ms)}`}
                                        />
                                    </div>
                                    <section className="analytics_block analytics_block_chart app-transition">
                                        <TrendChart
                                            series={timings.series || []}
                                            keys={TIMING_KEYS}
                                            hourly={isHourlyRange}
                                            format={formatMs}
                                        />
                                    </section>
                                    <section className="analytics_block app-transition">
                                        <h3 className="analytics_block_title">
                                            Where users wait the longest
                                        </h3>
                                        <p className="analytics_block_hint">
                                            Average per request. Own processing
                                            is about{' '}
                                            {formatMs(Math.max(0, apps))}, the
                                            rest is the database.
                                        </p>
                                        <RankedBars
                                            items={slowest}
                                            wideLabel
                                            empty="Not enough requests yet"
                                        />
                                    </section>
                                </>
                            ) : (
                                <section className="analytics_block app-transition">
                                    <p className="analytics_empty">
                                        Response times are collected from the
                                        moment this update is live
                                    </p>
                                </section>
                            )}
                        </AnalyticsGroup>

                        <AnalyticsGroup
                            title="Activity"
                            hint="Posts, users, comments, and likes"
                        >
                            <ActivityPanel activity={data?.activity} />
                        </AnalyticsGroup>
                    </AnalyticsScope>

                    <AnalyticsScope
                        title="Overview"
                        hint="Does not depend on the selected period"
                        className="analytics_scope_overall"
                    >
                        <div className="analytics_grid">
                            <AnalyticsGroup
                                title="Top posts"
                                hint="Total post views"
                            >
                                <section className="analytics_block app-transition">
                                    <RankedBars
                                        items={topPosts}
                                        wideLabel
                                        empty="No post views yet"
                                    />
                                </section>
                            </AnalyticsGroup>

                            <AnalyticsGroup
                                title="Tags"
                                hint="Across all content on the site"
                            >
                                <section className="analytics_block app-transition">
                                    <RankedBars
                                        items={topHashtags}
                                        wideLabel
                                        empty="This content has no tags yet"
                                    />
                                </section>
                            </AnalyticsGroup>
                        </div>
                    </AnalyticsScope>
                </>
            )}
        </div>
    );
};

export default DashboardPage;
