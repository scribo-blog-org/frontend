'use client';

import { useState } from 'react';

import Tooltip from '../../components/Ui/Tooltip';

import { formatDuration, type Timing } from './logFormat';

// A request that fires this many queries is almost never doing one job: it is
// usually a query repeated per item.
export const MANY_QUERIES = 30;
const VERY_SLOW_MS = 3000;

const split = ({ total, db }: Timing) => {
    const dbShare = total ? Math.min(1, db / total) : 0;
    return { dbShare, app: Math.max(0, total - db) };
};

const toneOf = (total: number) => (total >= VERY_SLOW_MS ? 'error' : 'warn');

const summary = (timing: Timing) => {
    const { app } = split(timing);
    return [
        `Database ${formatDuration(timing.db)}`,
        `Own processing ${formatDuration(app)}`,
        timing.queries ? `${timing.queries} queries` : null,
    ]
        .filter(Boolean)
        .join(' · ');
};

export const TimingPlate = ({ timing }: { timing: Timing }) => {
    const { dbShare } = split(timing);

    return (
        <Tooltip text={summary(timing)} className="log_timing_tip">
            <span className={`log_timing log_timing_${toneOf(timing.total)}`}>
                <span className="log_timing_value">
                    {formatDuration(timing.total)}
                </span>
                <span className="log_timing_bar" aria-hidden="true">
                    <span
                        className="log_timing_bar_db"
                        style={{ width: `${Math.round(dbShare * 100)}%` }}
                    />
                </span>
                {timing.queries ? (
                    <span
                        className={`log_timing_queries${timing.queries >= MANY_QUERIES ? ' log_timing_queries_many' : ''}`}
                    >
                        {timing.queries} q
                    </span>
                ) : null}
            </span>
        </Tooltip>
    );
};

type Part = 'db' | 'app';

export const TimingBreakdown = ({ timing }: { timing: Timing }) => {
    const [active, setActive] = useState<Part | null>(null);
    const [pinned, setPinned] = useState<Part | null>(null);
    const { dbShare, app } = split(timing);
    const current = pinned ?? active;
    const perQuery = timing.queries ? timing.db / timing.queries : 0;

    const parts: Array<{
        key: Part;
        label: string;
        ms: number;
        share: number;
        hint: string;
    }> = [
        {
            key: 'db',
            label: 'Database',
            ms: timing.db,
            share: dbShare,
            hint: timing.queries
                ? `${timing.queries} queries, ${formatDuration(perQuery)} each on average`
                : 'Time spent waiting for the database',
        },
        {
            key: 'app',
            label: 'Own processing',
            ms: app,
            share: 1 - dbShare,
            hint: 'Server code, other services and waiting for the network',
        },
    ];

    const bind = (key: Part) => ({
        onMouseEnter: () => setActive(key),
        onMouseLeave: () => setActive(null),
        onFocus: () => setActive(key),
        onBlur: () => setActive(null),
        onClick: () => setPinned((value) => (value === key ? null : key)),
        'aria-pressed': pinned === key,
    });

    return (
        <div className="log_timing_panel">
            <div className="log_timing_panel_total">
                <span className="log_timing_panel_label">Total</span>
                <span
                    className={`log_timing_panel_value log_timing_panel_value_${toneOf(timing.total)}`}
                >
                    {formatDuration(timing.total)}
                </span>
            </div>

            <div className="log_timing_split" role="group" aria-label="Split">
                {parts.map((part) => (
                    <button
                        key={part.key}
                        type="button"
                        className={`log_timing_segment log_timing_segment_${part.key}${current && current !== part.key ? ' log_timing_segment_dim' : ''}`}
                        style={{ flexGrow: Math.max(part.share, 0.02) }}
                        title={`${part.label}: ${formatDuration(part.ms)}`}
                        {...bind(part.key)}
                    />
                ))}
            </div>

            <div className="log_timing_legend">
                {parts.map((part) => (
                    <button
                        key={part.key}
                        type="button"
                        className={`log_timing_legend_item${current === part.key ? ' log_timing_legend_item_active' : ''}`}
                        {...bind(part.key)}
                    >
                        <span
                            className={`log_timing_dot log_timing_dot_${part.key}`}
                        />
                        <span className="log_timing_legend_label">
                            {part.label}
                        </span>
                        <span className="log_timing_legend_value">
                            {formatDuration(part.ms)}
                            <span className="log_timing_legend_share">
                                {Math.round(part.share * 100)}%
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <p className="log_timing_hint">
                {current
                    ? parts.find((part) => part.key === current)?.hint
                    : 'Hover or tap a part to see what it means'}
            </p>

            {timing.queries >= MANY_QUERIES ? (
                <p className="log_timing_warning">
                    {timing.queries} database queries for one request. The same
                    query is probably repeated for every item of a list.
                </p>
            ) : null}
        </div>
    );
};
