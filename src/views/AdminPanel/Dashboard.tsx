'use client';

import { useContext, useEffect, useMemo, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';
import { getDashboard } from '../../api/analytics.api';
import { hashtagSearchPath } from '../../utils/hashtags';

import Tabs from '../../components/Ui/Tabs';
import SwitchBar from '../../components/Ui/SwitchBar';
import DateTimePicker from '../../components/Ui/DateTimePicker';
import Loading from '../../components/Ui/Loading';

import {
    Block,
    Group,
    RankedBars,
    StatCard,
    TrendChart,
} from './DashboardParts/parts';
import {
    addDays,
    formatMs,
    formatNumber,
    formatPercent,
    routeLabel,
    toDayKey,
} from './DashboardParts/format';

import './Dashboard.scss';

// What is on screen. The period only exists for "activity"; the statistics are
// for the whole life of the site and do not depend on it, so that view has no
// period controls at all.
const VIEWS = [
    { key: 'activity', title: 'Activity' },
    { key: 'totals', title: 'Statistics' },
];

const PERIODS = [
    { key: '24h', title: '24 hours', back: 1 },
    { key: '7', title: '7 days', back: 6 },
    { key: '30', title: '30 days', back: 29 },
];

const TRAFFIC_KEYS = [
    { key: 'visits', label: 'All visits', color: 'var(--text-color)' },
    { key: 'signed_in', label: 'Signed in', color: 'var(--accent-color)' },
];

const TIMING_KEYS = [
    { key: 'avg_ms', label: 'Total', color: 'var(--text-color)' },
    {
        key: 'db_ms',
        label: 'Waiting for the database',
        color: 'var(--light-text-color)',
    },
];

const DEFAULT_RETENTION_DAYS = 70;

const placeRows = (items: any[] = []) =>
    items.map((item: any) => ({
        key: item.label,
        label: item.label,
        count: item.count,
        valueLabel: `${formatNumber(item.count)} · ${formatPercent(item.share)}`,
    }));

const categoryRows = (items: any[] = []) =>
    items.map((item: any) => ({
        key: String(item._id),
        label: item.name,
        count: item.count,
    }));

const DashboardPage = () => {
    const { showToast } = useContext(AppContext);
    const today = toDayKey(new Date());

    const [view, setView] = useState<string>('activity');
    const [period, setPeriod] = useState<string>('7');
    const [from, setFrom] = useState<string>(addDays(today, -6));
    const [to, setTo] = useState<string>(today);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const retention = data?.period?.retention_days ?? DEFAULT_RETENTION_DAYS;
    const earliest = addDays(today, -(retention - 1));

    // A preset also fills the date pickers, so they always show the range that
    // is on screen. Touching a picker switches to a custom range.
    const pickPeriod = (index: number) => {
        const preset = PERIODS[index];
        setPeriod(preset.key);
        setFrom(addDays(today, -preset.back));
        setTo(today);
    };

    const pickFrom = (value: string) => {
        setPeriod('custom');
        setFrom(value);
    };

    const pickTo = (value: string) => {
        setPeriod('custom');
        setTo(value);
    };

    const rangeError = useMemo(() => {
        if (period !== 'custom') {
            return null;
        }
        if (!from || !to) {
            return 'Pick both dates';
        }
        if (from > to) {
            return 'The start is after the end';
        }
        if (from < earliest) {
            return `Only the last ${retention} days are kept`;
        }
        if (from > today) {
            return 'The period is in the future';
        }
        return null;
    }, [period, from, to, earliest, today, retention]);

    // Only the activity view asks for a period, and only when it is valid.
    const skip = view !== 'activity' || Boolean(rangeError);
    const requestKey = period === 'custom' ? `custom:${from}:${to}` : period;

    useEffect(() => {
        if (skip) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            const result = await getDashboard({ period, from, to });

            if (cancelled) {
                return;
            }

            if (!result?.status) {
                showToast({
                    type: 'error',
                    message: result?.message || 'Could not load analytics',
                });
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
        // The key stands for period, from and to.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey, skip, showToast]);

    // The totals do not depend on the period, so they come from the first
    // answer and need no request of their own.
    const hourly = data?.period?.granularity === 'hour';
    const traffic = data?.traffic || {};
    const people = data?.people || {};
    const content = data?.content || {};
    const places = data?.places || {};
    const performance = data?.performance || {};
    const overview = data?.overview || {};

    const slowest = useMemo(
        () =>
            (data?.performance?.slowest || []).map((item: any) => ({
                key: item.route,
                label: routeLabel(item.route),
                count: item.avg_ms,
                valueLabel: formatMs(item.avg_ms),
                note: `p95 ${formatMs(item.p95_ms)} · DB ${formatMs(item.db_avg_ms)}`,
            })),
        [data],
    );
    const heaviest = useMemo(
        () =>
            (data?.performance?.heaviest || []).map((item: any) => ({
                key: item.route,
                label: routeLabel(item.route),
                count: item.total_ms,
                valueLabel: formatMs(item.total_ms),
                note: `${formatNumber(item.requests)} requests · avg ${formatMs(item.avg_ms)}`,
            })),
        [data],
    );
    const topPosts = useMemo(
        () =>
            (data?.overview?.top_posts || []).map((item: any) => ({
                key: String(item._id),
                title: item.title,
                count: item.views_count || 0,
                href: `/posts/${item._id}`,
            })),
        [data],
    );
    const topHashtags = useMemo(
        () =>
            (data?.overview?.top_hashtags || []).map((item: any) => ({
                key: item.tag,
                tag: item.tag,
                count: item.uses || 0,
                href: hashtagSearchPath(item.tag),
                hashtag: true,
            })),
        [data],
    );

    const hasTimings = Number(performance.requests || 0) > 0;
    const ownTime = Math.max(
        0,
        Number(performance.avg_ms || 0) - Number(performance.db_avg_ms || 0),
    );
    const periodIndex = PERIODS.findIndex((item) => item.key === period);

    return (
        <div className="analytics">
            <div className="analytics_bar">
                <Tabs
                    label="Dashboard view"
                    items={VIEWS}
                    activeKey={view}
                    onChange={setView}
                />
                {view === 'activity' ? (
                    <div className="analytics_period">
                        <SwitchBar
                            items={PERIODS.map((item) => item.title)}
                            activeIndex={periodIndex}
                            onChange={pickPeriod}
                        />
                        <div className="analytics_period_dates">
                            <DateTimePicker
                                type="date"
                                value={from}
                                min={earliest}
                                max={to || today}
                                clearable={false}
                                onChange={pickFrom}
                            />
                            <span className="analytics_period_dash">—</span>
                            <DateTimePicker
                                type="date"
                                value={to}
                                min={from || earliest}
                                max={today}
                                clearable={false}
                                onChange={pickTo}
                            />
                        </div>
                        {rangeError ? (
                            <p className="analytics_period_error">
                                {rangeError}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {view === 'activity' ? (
                !data ? (
                    <Loading size={40} />
                ) : (
                    <div
                        className={`analytics_body${isLoading ? ' analytics_body_loading' : ''}`}
                    >
                        <Group title="Traffic">
                            <div className="analytics_stats">
                                <StatCard
                                    label="Visits"
                                    value={traffic.visits}
                                    previous={traffic.visits_prev}
                                />
                                <StatCard
                                    label="Signed-in visits"
                                    display={formatPercent(
                                        traffic.signed_in_share,
                                    )}
                                    hint={`${formatNumber(traffic.signed_in)} of ${formatNumber(traffic.visits)} visits`}
                                />
                                <StatCard
                                    label="Active users"
                                    value={traffic.unique_signed_in}
                                    hint="Different accounts that visited"
                                />
                            </div>
                            <Block chart>
                                {traffic.series?.length ? (
                                    <TrendChart
                                        series={traffic.series}
                                        keys={TRAFFIC_KEYS}
                                        hourly={hourly}
                                    />
                                ) : (
                                    <p className="analytics_empty">
                                        No visits in this period
                                    </p>
                                )}
                            </Block>
                        </Group>

                        <Group title="Users">
                            <div className="analytics_stats">
                                <StatCard
                                    label="New users"
                                    value={people.registered}
                                    previous={people.registered_prev}
                                    hint="Registered"
                                />
                                <StatCard
                                    label="Sign-ins"
                                    value={people.logins}
                                    previous={people.logins_prev}
                                />
                            </div>
                        </Group>

                        <Group title="Content">
                            <div className="analytics_stats">
                                <StatCard
                                    label="Posts"
                                    value={content.posts}
                                    previous={content.posts_prev}
                                />
                                <StatCard
                                    label="Comments"
                                    value={content.comments}
                                    previous={content.comments_prev}
                                />
                                <StatCard
                                    label="Post likes"
                                    value={content.likes}
                                    previous={content.likes_prev}
                                />
                            </div>
                            <Block title="New posts by category">
                                <RankedBars
                                    items={categoryRows(content.by_category)}
                                    wideLabel
                                    empty="No posts were published in this period"
                                />
                            </Block>
                        </Group>

                        <Group
                            title="Where visitors come from"
                            hint="Cities, by number of visits"
                        >
                            <Block>
                                <RankedBars
                                    items={placeRows(places.top)}
                                    wideLabel
                                    empty="No locations in this period"
                                />
                            </Block>
                            {places.unknown_visits ? (
                                <p className="analytics_group_note">
                                    {formatNumber(places.unknown_visits)} visits
                                    without a known location are not included
                                </p>
                            ) : null}
                        </Group>

                        <Group title="Response time">
                            {hasTimings ? (
                                <>
                                    <div className="analytics_stats">
                                        <StatCard
                                            label="Typical wait"
                                            display={formatMs(
                                                performance.p50_ms,
                                            )}
                                            hint="Half of the requests are faster"
                                        />
                                        <StatCard
                                            label="Slow requests"
                                            display={formatMs(
                                                performance.p95_ms,
                                            )}
                                            hint="95% of requests are faster"
                                        />
                                        <StatCard
                                            label="Average"
                                            display={formatMs(
                                                performance.avg_ms,
                                            )}
                                            hint={`${formatMs(performance.db_avg_ms)} of it is waiting for the database (${formatPercent(performance.db_share)})`}
                                        />
                                        <StatCard
                                            label="Requests"
                                            value={performance.requests}
                                            hint={`Slowest took ${formatMs(performance.max_ms)}`}
                                        />
                                    </div>
                                    <Block chart>
                                        <TrendChart
                                            series={performance.series || []}
                                            keys={TIMING_KEYS}
                                            hourly={hourly}
                                            format={formatMs}
                                        />
                                    </Block>
                                    <div className="analytics_grid">
                                        <Block
                                            title="Where users wait the longest"
                                            hint={`Average per request. Own processing is about ${formatMs(ownTime)}, the rest is the database.`}
                                        >
                                            <RankedBars
                                                items={slowest}
                                                wideLabel
                                                empty="Not enough requests yet"
                                            />
                                        </Block>
                                        <Block
                                            title="Takes the most time overall"
                                            hint="Request count times average time"
                                        >
                                            <RankedBars
                                                items={heaviest}
                                                wideLabel
                                                empty="Not enough requests yet"
                                            />
                                        </Block>
                                    </div>
                                </>
                            ) : (
                                <Block>
                                    <p className="analytics_empty">
                                        No requests were measured in this
                                        period
                                    </p>
                                </Block>
                            )}
                        </Group>
                    </div>
                )
            ) : !data ? (
                <Loading size={40} />
            ) : (
                <div className="analytics_body">
                    <Group title="Totals">
                        <div className="analytics_stats">
                            <StatCard label="Users" value={overview.users} />
                            <StatCard label="Posts" value={overview.posts} />
                            <StatCard
                                label="Comments"
                                value={overview.comments}
                            />
                            <StatCard
                                label="Likes"
                                value={overview.likes}
                                hint="On posts and comments"
                            />
                        </div>
                    </Group>

                    <div className="analytics_grid">
                        <Group title="Top posts" hint="By total views">
                            <Block>
                                <RankedBars
                                    items={topPosts}
                                    wideLabel
                                    empty="No post views yet"
                                />
                            </Block>
                        </Group>
                        <Group title="Tags" hint="Posts and comments">
                            <Block>
                                <RankedBars
                                    items={topHashtags}
                                    wideLabel
                                    empty="This content has no tags yet"
                                />
                            </Block>
                        </Group>
                    </div>

                    <Group
                        title="Posts by category"
                        hint={`${formatNumber(overview.categories)} categories`}
                    >
                        <Block>
                            <RankedBars
                                items={categoryRows(overview.by_category)}
                                wideLabel
                                empty="No posts yet"
                            />
                        </Block>
                    </Group>

                </div>
            )}
        </div>
    );
};

export default DashboardPage;
